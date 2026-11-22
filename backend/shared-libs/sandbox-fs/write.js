// index.js

import fs from "node:fs/promises";
import path from "node:path";


// ============================================================
// SandboxFSWrite
// ============================================================

export class SandboxFSWrite {
  #mounts;

  constructor(mounts) {
    this.#mounts = Object.freeze({
      ...mounts,
    });
  }


  // ==========================================================
  // CREATE
  // ==========================================================

  static async create(mounts = {}) {
    const resolvedMounts = {};

    for (const [virtualPath, realPath] of Object.entries(mounts)) {
      if (
        typeof virtualPath !== "string" ||
        !virtualPath.startsWith("/")
      ) {
        throw new Error(
          `Invalid virtual mount path: ${virtualPath}`
        );
      }

      const normalized =
        path.posix.normalize(virtualPath);

      if (normalized !== virtualPath) {
        throw new Error(
          `Mount path must be normalized: ${virtualPath}`
        );
      }

      if (Object.hasOwn(resolvedMounts, normalized)) {
        throw new Error(
          `Duplicate mount: ${normalized}`
        );
      }

      // mkdir -p
      await fs.mkdir(realPath, {
        recursive: true,
      });

      const realRoot =
        await fs.realpath(realPath);

      const stat =
        await fs.stat(realRoot);

      if (!stat.isDirectory()) {
        throw new Error(
          `Mount source is not a directory: ${realPath}`
        );
      }

      resolvedMounts[normalized] =
        realRoot;
    }

    return new SandboxFSWrite(
      resolvedMounts
    );
  }


  // ==========================================================
  // RESULT HELPERS
  // ==========================================================

  #ok(data = {}) {
    return [
      0,
      data,
    ];
  }

  #fail(message, code = "ERROR") {
    return [
      -1,
      {
        code,
        message,
      },
    ];
  }


  // ==========================================================
  // NORMALIZE VIRTUAL PATH
  // ==========================================================

  #normalizeVirtualPath(input) {
    if (typeof input !== "string") {
      throw new Error(
        "Path must be a string"
      );
    }

    if (!input.startsWith("/")) {
      throw new Error(
        `Virtual paths must be absolute: ${input}`
      );
    }

    return path.posix.normalize(input);
  }


  // ==========================================================
  // FIND LONGEST MATCHING MOUNT
  // ==========================================================

#findMount(virtualPath) {
  let bestMount = null;
  let bestLength = -1;

  for (const mountPoint of Object.keys(this.#mounts)) {
    // Special-case "/": `${mountPoint}/` would be "//", which never matches.
    // The root mount contains every absolute virtual path.
    const matches =
      virtualPath === mountPoint ||
      (mountPoint === "/"
        ? virtualPath.startsWith("/")
        : virtualPath.startsWith(`${mountPoint}/`));

    if (matches && mountPoint.length > bestLength) {
      bestMount = mountPoint;
      bestLength = mountPoint.length;
    }
  }

  if (!bestMount) {
    return null;
  }

  return {
    virtualPath: bestMount,
    realPath: this.#mounts[bestMount],
  };
}



  // ==========================================================
  // INSIDE MOUNT CHECK
  // ==========================================================

  #isInsideMount(realPath, mountRoot) {
    const relative =
      path.relative(
        mountRoot,
        realPath
      );

    return !(
      relative === ".." ||
      relative.startsWith(
        `..${path.sep}`
      ) ||
      path.isAbsolute(relative)
    );
  }


  // ==========================================================
  // RESOLVE PATH
  // ==========================================================

  async resolve(input) {
    const virtualPath =
      this.#normalizeVirtualPath(input);

    const mount =
      this.#findMount(virtualPath);

    if (!mount) {
      console.log("Mounts: ", this.#mounts);
      throw new Error(
        `Access denied: ${virtualPath} is not mounted. Mounts: ${JSON.stringify(this.#mounts)}`
      );
    }

    const relative =
      path.posix.relative(
        mount.virtualPath,
        virtualPath
      );

    const candidate =
      path.join(
        mount.realPath,
        relative
      );



    // --------------------------------------------------------
    // Existing path
    // --------------------------------------------------------

    try {


    // Block symlinks
const info = await fs.lstat(candidate);

if (info.isSymbolicLink()) {
    throw new Error(`Symlinks are not supported: ${candidate}`);
}


      const realPath =
        await fs.realpath(candidate);

      if (
        !this.#isInsideMount(
          realPath,
          mount.realPath
        )
      ) {
        throw new Error(
          `Access denied: ${virtualPath} escapes its mount`
        );
      }

      return {
        virtualPath,
        realPath,
        mount,
        exists: true,
      };

    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }


// --------------------------------------------------------
// Non-existing path
//
// Resolve the nearest existing parent WITHOUT following
// symlinks. Every existing component must be a real
// directory/file entry, never a symlink.
// --------------------------------------------------------

let current = candidate;
const missingParts = [];

while (true) {
  try {
    const info =
      await fs.lstat(current);

    // Never follow a symlink.
    if (info.isSymbolicLink()) {
      throw new Error(
        `Symlinks are not supported: ${current}`
      );
    }

    const existing =
      await fs.realpath(current);

    if (
      !this.#isInsideMount(
        existing,
        mount.realPath
      )
    ) {
      throw new Error(
        `Access denied: ${virtualPath} escapes its mount`
      );
    }

    let result = existing;

    for (
      let i = missingParts.length - 1;
      i >= 0;
      i--
    ) {
      result =
        path.join(
          result,
          missingParts[i]
        );
    }

    if (
      !this.#isInsideMount(
        result,
        mount.realPath
      )
    ) {
      throw new Error(
        `Access denied: ${virtualPath} escapes its mount`
      );
    }

    return {
      virtualPath,
      realPath: result,
      mount,
      exists: false,
    };

  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const name =
    path.basename(current);

  missingParts.push(name);

  const parent =
    path.dirname(current);

  if (parent === current) {
    throw new Error(
      `Unable to resolve path: ${virtualPath}`
    );
  }

  current = parent;
}
  }


  // ==========================================================
  // MOUNT ROOT
  // ==========================================================

  #isMountRoot(virtualPath, mount) {
    return (
      virtualPath ===
      mount.virtualPath
    );
  }


// ==========================================================
// COPY DESTINATION
//
// - destination does not exist      => exact copy to target
// - destination is an existing dir  => copy INTO it:
//
//       cp("/src/my-folder", "/src/existing")
//         =>  /src/existing/my-folder
// ==========================================================

async #resolveCopyDestination(sourcePath, sourceStat, destination) {
  const destinationPath =
    await this.resolve(destination);


  // --------------------------------------------------------
  // Destination does not exist
  // --------------------------------------------------------

  if (!destinationPath.exists) {
    return { target: destinationPath };
  }


  // --------------------------------------------------------
  // Destination exists
  // --------------------------------------------------------

  const destinationStat =
    await fs.lstat(destinationPath.realPath);


  // Existing directory: copy INTO it
  // (works for folders AND files, like POSIX cp)

  if (destinationStat.isDirectory()) {
    const sourceName =
      path.posix.basename(sourcePath.virtualPath);

    const insideVirtualPath =
      path.posix.join(
        destinationPath.virtualPath,
        sourceName
      );

    const insidePath =
      await this.resolve(insideVirtualPath);

    if (insidePath.exists) {
      return {
        error: this.#fail(
          `${insideVirtualPath} already exists`,
          "DESTINATION_EXISTS"
        ),
      };
    }

    return { target: insidePath };
  }


  // Destination exists but is not a directory

  return {
    error: this.#fail(
      `${destinationPath.virtualPath} already exists`,
      "DESTINATION_EXISTS"
    ),
  };
}

  // ==========================================================
  // DESTINATION MUST NOT EXIST
  // ==========================================================

  async #destinationMustNotExist(resolved) {
    try {
      await fs.lstat(
        resolved.realPath
      );

      return this.#fail(
        `${resolved.virtualPath} already exists`,
        "DESTINATION_EXISTS"
      );

    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }

    return null;
  }


  // ==========================================================
  // IMPORTANT SECURITY CHECK
  //
  // Recursively inspect a tree BEFORE copy/move.
  //
  // fs.cp(..., dereference:false) will happily copy a symlink
  // as a symlink. That is not sufficient for this sandbox.
  //
  // Every symlink in the tree must resolve INSIDE the mount.
  //
  // An escaping symlink causes the complete operation to fail
  // before the copy begins.
  // ==========================================================

  async #validateTree(realPath, mountRoot) {
    const stat =
      await fs.lstat(realPath);


    // --------------------------------------------------------
    // Symlink
   // --------------------------------------------------------


if (stat.isSymbolicLink()) {
    throw new Error(
        `Symlinks are not supported: ${realPath}`
    );
}


    // --------------------------------------------------------
    // Directory
    // --------------------------------------------------------

    if (stat.isDirectory()) {
      const entries =
        await fs.readdir(
          realPath,
          {
            withFileTypes: true,
          }
        );

      for (const entry of entries) {
        const child =
          path.join(
            realPath,
            entry.name
          );

        await this.#validateTree(
          child,
          mountRoot
        );
      }

      return;
    }


    // --------------------------------------------------------
    // Regular file / other object
    // --------------------------------------------------------

    if (
      stat.isFile()
    ) {
      return;
    }

    throw new Error(
      `Unsupported filesystem object: ${realPath}`
    );
  }


  // ==========================================================
  // WRITE
  // ==========================================================

  async write(virtualPath, content) {
    try {
      if (typeof content !== "string") {
        return this.#fail(
          "Content must be a string",
          "INVALID_CONTENT"
        );
      }

      const resolved =
        await this.resolve(
          virtualPath
        );

      if (resolved.exists) {
        const stat =
          await fs.stat(
            resolved.realPath
          );

        if (stat.isDirectory()) {
          return this.#fail(
            `${virtualPath} is a directory`,
            "IS_DIRECTORY"
          );
        }

        if (!stat.isFile()) {
          return this.#fail(
            `${virtualPath} is not a regular file`,
            "NOT_FILE"
          );
        }
      }

      await fs.mkdir(
        path.dirname(
          resolved.realPath
        ),
        {
          recursive: true,
        }
      );

      await fs.writeFile(
        resolved.realPath,
        content,
        "utf8"
      );

      return this.#ok({
        path: virtualPath,
        bytes:
          Buffer.byteLength(
            content,
            "utf8"
          ),
      });

    } catch (err) {
      return this.#fail(
        err.message,
        "WRITE_FAILED"
      );
    }
  }


  // ==========================================================
  // MKDIR
  // ==========================================================
  async mkdir(virtualPath) {
    try {
      const normalized =
        this.#normalizeVirtualPath(
          virtualPath
        );

      const mount =
        this.#findMount(normalized);

      if (!mount) {
        return this.#fail(
          `Access denied: ${virtualPath} is not mounted. Mounts: ${JSON.stringify(this.#mounts)}`,
          "MKDIR_FAILED"
        );
      }

      if (
        this.#isMountRoot(
          normalized,
          mount
        )
      ) {
        return this.#fail(
          `${virtualPath} is a mount root`,
          "MOUNT_ROOT"
        );
      }

      const resolved =
        await this.resolve(
          normalized
        );

      if (resolved.exists) {
        const stat =
          await fs.stat(
            resolved.realPath
          );

        if (stat.isDirectory()) {
          return this.#fail(
            `${virtualPath} already exists`,
            "ALREADY_EXISTS"
          );
        }

        return this.#fail(
          `${virtualPath} already exists and is not a directory`,
          "ALREADY_EXISTS"
        );
      }

      await fs.mkdir(
        resolved.realPath,
        {
          recursive: true,
        }
      );

      return this.#ok({
        path: virtualPath,
      });

    } catch (err) {
      return this.#fail(
        err.message,
        "MKDIR_FAILED"
      );
    }
  }


  // ==========================================================
  // REMOVE
  // ==========================================================

  async rm(virtualPath) {
    try {
      const normalized =
        this.#normalizeVirtualPath(
          virtualPath
        );

      const mount =
        this.#findMount(normalized);

      if (!mount) {
        return this.#fail(
          `Access denied: ${virtualPath} is not mounted`,
          "RM_FAILED"
        );
      }

      if (
        this.#isMountRoot(
          normalized,
          mount
        )
      ) {
        return this.#fail(
          `${virtualPath} is a mount root`,
          "MOUNT_ROOT"
        );
      }

      const resolved =
        await this.resolve(
          normalized
        );

      if (!resolved.exists) {
        return this.#fail(
          `${virtualPath} does not exist`,
          "NOT_FOUND"
        );
      }

      const stat =
        await fs.lstat(
          resolved.realPath
        );


      // --------------------------------------------------------
      // IMPORTANT:
      //
      // We don't support symlinks for security
      // --------------------------------------------------------

if (stat.isSymbolicLink()) {
    return this.#ok({
        path: virtualPath,
        skipped: true,
        type: "symlink",
    });
}


      if (stat.isDirectory()) {
        await fs.rm(
          resolved.realPath,
          {
            recursive: true,
            force: false,
          }
        );

        return this.#ok({
          path: virtualPath,
          type: "directory",
          recursive: true,
        });
      }


      if (stat.isFile()) {
        await fs.unlink(
          resolved.realPath
        );

        return this.#ok({
          path: virtualPath,
          type: "file",
        });
      }

      return this.#fail(
        `${virtualPath} is not a regular file or directory`,
        "UNSUPPORTED_TYPE"
      );

    } catch (err) {
      return this.#fail(
        err.message,
        "RM_FAILED"
      );
    }
  }


// ==========================================================
// COPY
// ==========================================================

async cp(source, destination) {
  try {
    const sourcePath =
      await this.resolve(source);


    // ------------------------------------------------------
    // Source
    // ------------------------------------------------------

    if (!sourcePath.exists) {
      return this.#fail(
        `${source} does not exist`,
        "SOURCE_NOT_FOUND"
      );
    }

    if (
      this.#isMountRoot(
        sourcePath.virtualPath,
        sourcePath.mount
      )
    ) {
      return this.#fail(
        `${source} is a mount root`,
        "MOUNT_ROOT"
      );
    }


    // ------------------------------------------------------
    // Source type
    // ------------------------------------------------------

    const sourceStat =
      await fs.lstat(sourcePath.realPath);

    if (sourceStat.isSymbolicLink()) {
      return this.#fail(
        `${source} is a symlink`,
        "SYMLINK_SOURCE"
      );
    }

    if (
      !sourceStat.isFile() &&
      !sourceStat.isDirectory()
    ) {
      return this.#fail(
        `${source} is not a regular file or directory`,
        "UNSUPPORTED_SOURCE"
      );
    }


    // ------------------------------------------------------
    // Destination
    // ------------------------------------------------------

    const destinationResult =
      await this.#resolveCopyDestination(
        sourcePath,
        sourceStat,
        destination
      );

    if (destinationResult.error) {
      return destinationResult.error;
    }

    const destinationPath =
      destinationResult.target;


    // ------------------------------------------------------
    // SOURCE TREE SECURITY VALIDATION
    // ------------------------------------------------------

    await this.#validateTree(
      sourcePath.realPath,
      sourcePath.mount.realPath
    );


    // ------------------------------------------------------
    // Destination parent
    // ------------------------------------------------------

    await fs.mkdir(
      path.dirname(
        destinationPath.realPath
      ),
      {
        recursive: true,
      }
    );


    // ------------------------------------------------------
    // COPY
    // ------------------------------------------------------

    await fs.cp(
      sourcePath.realPath,
      destinationPath.realPath,
      {
        recursive:
          sourceStat.isDirectory(),

        force: false,
        errorOnExist: true,
        dereference: false,
      }
    );

    return this.#ok({
      source,
      destination: destinationPath.virtualPath,
      type:
        sourceStat.isDirectory()
          ? "directory"
          : "file",
    });

  } catch (err) {
    return this.#fail(
      err.message,
      "COPY_FAILED"
    );
  }
}



  // ==========================================================
  // MOVE
  // ==========================================================

  async mv(source, destination) {
    try {
      const sourcePath =
        await this.resolve(
          source
        );

      const destinationPath =
        await this.resolve(
          destination
        );


      // ------------------------------------------------------
      // Source
      // ------------------------------------------------------

      if (!sourcePath.exists) {
        return this.#fail(
          `${source} does not exist`,
          "SOURCE_NOT_FOUND"
        );
      }


      // ------------------------------------------------------
      // Mount roots
      // ------------------------------------------------------

      if (
        this.#isMountRoot(
          sourcePath.virtualPath,
          sourcePath.mount
        )
      ) {
        return this.#fail(
          `${source} is a mount root`,
          "MOUNT_ROOT"
        );
      }

      if (
        this.#isMountRoot(
          destinationPath.virtualPath,
          destinationPath.mount
        )
      ) {
        return this.#fail(
          `${destination} is a mount root`,
          "MOUNT_ROOT"
        );
      }


      // ------------------------------------------------------
      // Destination
      // ------------------------------------------------------

      const destinationError =
        await this.#destinationMustNotExist(
          destinationPath
        );

      if (destinationError) {
        return destinationError;
      }


      // ------------------------------------------------------
      // Validate source tree BEFORE move
      //
      // This is important for directories containing symlinks.
      // ------------------------------------------------------

      await this.#validateTree(
        sourcePath.realPath,
        sourcePath.mount.realPath
      );


      const sourceStat =
        await fs.lstat(
          sourcePath.realPath
        );

      if (
        sourceStat.isSymbolicLink()
      ) {
        return this.#fail(
          `${source} is a symlink`,
          "SYMLINK_SOURCE"
        );
      }

      if (
        !sourceStat.isFile() &&
        !sourceStat.isDirectory()
      ) {
        return this.#fail(
          `${source} is not a regular file or directory`,
          "UNSUPPORTED_SOURCE"
        );
      }


      // ------------------------------------------------------
      // Destination parent
      // ------------------------------------------------------

      await fs.mkdir(
        path.dirname(
          destinationPath.realPath
        ),
        {
          recursive: true,
        }
      );


      // ------------------------------------------------------
      // Same mount
      // ------------------------------------------------------

      if (
        sourcePath.mount.virtualPath ===
        destinationPath.mount.virtualPath
      ) {
        await fs.rename(
          sourcePath.realPath,
          destinationPath.realPath
        );

        return this.#ok({
          source,
          destination,

          type:
            sourceStat.isDirectory()
              ? "directory"
              : "file",

          crossMount: false,
        });
      }


      // ------------------------------------------------------
      // Cross-mount
      //
      // copy() performs its own full security validation.
      // Only remove the source after successful copy.
      // ------------------------------------------------------

      const copied =
        await this.cp(
          source,
          destination
        );

      if (copied[0] !== 0) {
        return this.#fail(
          copied[1]?.message ||
            "Cross-mount copy failed",
          "MOVE_FAILED"
        );
      }


      const removed =
        await this.rm(source);

      if (removed[0] !== 0) {
        return this.#fail(
          `Copied to ${destination} but failed to remove ${source}: ${removed[1]?.message || "unknown error"}`,
          "MOVE_PARTIAL"
        );
      }

      return this.#ok({
        source,
        destination,

        type:
          sourceStat.isDirectory()
            ? "directory"
            : "file",

        crossMount: true,
      });

    } catch (err) {
      return this.#fail(
        err.message,
        "MOVE_FAILED"
      );
    }
  }


  // ==========================================================
  // MOUNTS
  // ==========================================================

  mounts() {
    return this.#ok({
      count:
        Object.keys(
          this.#mounts
        ).length,

      mounts: {
        ...this.#mounts,
      },
    });
  }
}
