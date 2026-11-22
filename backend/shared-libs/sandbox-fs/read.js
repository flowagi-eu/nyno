// sandbox-fs.mjs

import fs from "node:fs/promises";
import path from "node:path";
import fsSync from "node:fs";

// ============================================================
// SandboxFSRead
// ============================================================

export class SandboxFSRead {
  #mounts;

  constructor(mounts) {
    // Mount configuration is immutable for the lifetime
    // of this SandboxFSRead instance.
    this.#mounts = Object.freeze(mounts);
  }

  /**
   * Create a SandboxFSRead with fixed mounts.
   *
   * Example:
   *
   *   const fs = await SandboxFSRead.create({
   *     "/data": "./demo-data",
   *   });
   *
   * There is intentionally no mount() or unmount() method.
   */
  static async create(mounts = {}) {
    const resolvedMounts = {};

    for (const [virtualPath, realPath] of Object.entries(mounts)) {
      if (
        typeof virtualPath !== "string" ||
        !virtualPath.startsWith("/")
      ) {
        throw new Error(
          `Invalid virtual path: ${virtualPath}`
        );
      }

      const normalized =
        path.posix.normalize(virtualPath);

      if (Object.hasOwn(resolvedMounts, normalized)) {
        throw new Error(
          `Duplicate mount: ${normalized}`
        );
      }

      const realRoot =
        await fs.realpath(realPath);

      const stat =
        await fs.stat(realRoot);

      if (!stat.isDirectory()) {
        throw new Error(
          `Mount source is not a directory: ${realPath}`
        );
      }

      resolvedMounts[normalized] = realRoot;
    }

    return new SandboxFSRead(resolvedMounts);
  }


  // ==========================================================
  // Result helpers
  // ==========================================================

  #ok(data = {}) {
    return [0, data];
  }

  #falsy(data, retCode = 1) {
    return [
      retCode,
      data
    ];
  }

  #fail(message, code = "ERROR", retCode = -1) {
    return [
      retCode,
      {
        code,
        message,
      },
    ];
  }


  // ==========================================================
  // Path handling
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


#findMount(virtualPath) {
  let bestMount = null;
  let bestLength = -1;

  for (const mountPoint of Object.keys(this.#mounts)) {
    const matches =
      mountPoint === "/" ||
      virtualPath === mountPoint ||
      virtualPath.startsWith(mountPoint + "/");

    if (
      matches &&
      mountPoint.length > bestLength
    ) {
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


  async resolve(input) {
    const virtualPath =
      this.#normalizeVirtualPath(input);

    const mount =
      this.#findMount(virtualPath);

    if (!mount) {
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


const info = await fs.lstat(candidate);

if (info.isSymbolicLink()) {
    throw new Error(`Symlinks are not supported: ${candidate}`);
}

    /*
     * Resolve the actual filesystem path.
     *
     * This also means symlinks cannot be used to escape
     * the mounted directory.
     */
    const realPath =
      await fs.realpath(candidate);

    /*
     * Make sure the resolved path is still inside
     * the mounted directory.
     */
    const relativeToRoot =
      path.relative(
        mount.realPath,
        realPath
      );

    const escaped =
      relativeToRoot === ".." ||
      relativeToRoot.startsWith(
        `..${path.sep}`
      ) ||
      path.isAbsolute(relativeToRoot);

    if (escaped) {
      throw new Error(
        `Access denied: ${virtualPath} escapes its mount`
      );
    }

    return realPath;
  }


  // ==========================================================
  // Public API
  // ==========================================================

  mounts() {
    return this.#ok({
      count: Object.keys(this.#mounts).length,

      mounts: {
        ...this.#mounts,
      },
    });
  }

  existsSync(virtualPath) {
  try {
    const normalized =
      this.#normalizeVirtualPath(virtualPath);

    const mount =
      this.#findMount(normalized);

    if (!mount) {
      return this.#fail(
        err.message,
        "NOT_MOUNTED_EXISTS_SYNC"
      );
    }

    const relative =
      path.posix.relative(
        mount.virtualPath,
        normalized
      );

    const candidate =
      path.join(
        mount.realPath,
        relative
      );

      const result = fsSync.existsSync(candidate);
      if(result){
        return this.#ok(true);
      } else {
        return this.#falsy(false);
      }
  } catch(err) {
    return false;

    return this.#fail(
      err.message,
      "EXISTS_SYNC_FAILED"
    );

  }
}


 async ls(virtualPath = "/") {
  try {
    const realPath =
      await this.resolve(virtualPath);

    const stat =
      await fs.stat(realPath);

    if (!stat.isDirectory()) {
      return this.#fail(
        `${virtualPath} is not a directory`,
        "NOT_DIRECTORY"
      );
    }

    const entries =
      await fs.readdir(realPath, {
        withFileTypes: true,
      });

    const result = [];

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const entryPath =
        path.join(realPath, entry.name);

      const entryStat =
        await fs.stat(entryPath);

      result.push({
        name: entry.name,

        dir:
          entry.isDirectory()
            ? true
            : false,

        mtime: entryStat.mtimeMs,
      });
    }

    return this.#ok(result);

  } catch (err) {
    return this.#fail(
      err.message,
      "LS_FAILED"
    );
  }
}

async cat_base64(virtualPath) {
    try {
      const realPath = await this.resolve(virtualPath);

      const stat = await fs.stat(realPath);

      if (stat.isDirectory()) {
        return this.#fail(
          `${virtualPath} is a directory`,
          "IS_DIRECTORY"
        );
      }

      if (!stat.isFile()) {
        return this.#fail(
          `${virtualPath} is not a file, rp= ${realPath}`,
          "NOT_FILE"
        );
      }

      // Read without encoding returns a Buffer.
      // We can then safely convert it to a base64 string.
      const contentBuffer = await fs.readFile(realPath);
      const base64Content = contentBuffer.toString("base64");

      return this.#ok(base64Content);

    } catch (err) {
      return this.#fail(
        err.message,
        "CAT_BASE64_FAILED",
        1
      );
    }
  }

  async cat(virtualPath) {
    try {
      const realPath =
        await this.resolve(virtualPath);

	{
  const stat =
      await fs.stat(realPath);
// Explicitly reject directories.
    if (stat.isDirectory()) {
      return this.#fail(
        `${virtualPath} is a directory`,
        "IS_DIRECTORY"
      );
    }
	}


      const stat =
        await fs.stat(realPath);

      if (!stat.isFile()) {
        return this.#fail(
          `${virtualPath} is not a file, rp= ${realPath}`,
          "NOT_FILE"
        );
      }

      const content =
        await fs.readFile(
          realPath,
          "utf8"
        );

      return this.#ok(content);

    } catch (err) {
      return this.#fail(
        err.message,
        "CAT_FAILED",
	1
      );
    }
  }
}


