import { execFileSync } from "child_process";
import path from "path";

export function nyno_push_update(args, context) {
    if (args.length < 2 && !context["GHP_TOKEN"]) {
        const msg = "Usage: push_update <github_username> <commit_message> [repo_path] (GHP_TOKEN must be set in context)";
        context["push-update.error"] = msg;
        return 1;
    }

    const USERNAME = args[0];
    const TOKEN = context["GHP_TOKEN"]; // use token from context
    const COMMIT_MSG = args[1];
    const REPO_PATH = args[2] || ".";

    const setName = context["set_context"] || "push-update";

    try {
        const cwd = path.resolve(REPO_PATH); // safe absolute path

        // Get current remote
        const ORIGINAL_URL = execFileSync("git", ["remote", "get-url", "origin"], { cwd, encoding: "utf8" }).trim();

        let remoteUpdated = false;

        if (!ORIGINAL_URL.includes(":ghp_")) {
            // Extract OWNER/REPO
            const match = ORIGINAL_URL.match(/github\.com[:/](.+\/.+?)(\.git)?$/);
            if (!match) {
                context[setName + ".error"] = `Could not parse remote URL: ${ORIGINAL_URL}`;
                return 2;
            }

            const OWNER_REPO = match[1].replace(/\.git$/, "");
            const TOKEN_URL = `https://${USERNAME}:${TOKEN}@github.com/${OWNER_REPO}.git`;

            // Set remote URL securely
            execFileSync("git", ["remote", "set-url", "origin", TOKEN_URL], { cwd, stdio: "inherit" });
            remoteUpdated = true;
        }

        // Add all changes
        execFileSync("git", ["add", "."], { cwd, stdio: "inherit" });

        // Commit changes (ignore if nothing to commit)
        try {
            execFileSync("git", ["commit", "-m", COMMIT_MSG], { cwd, stdio: "inherit" });
        } catch (e) {
            // ignore "nothing to commit"
        }

        // Get current branch
        const CURRENT_BRANCH = execFileSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8" }).trim();

        // Push securely
        execFileSync("git", ["push", "origin", CURRENT_BRANCH], { cwd, stdio: "inherit" });

        context[setName] = {
            message: "Changes pushed successfully!",
            remoteUpdated,
            branch: CURRENT_BRANCH
        };

        return 0;

    } catch (err) {
        context[setName + ".error"] = err.toString();
        return 3;
    }
}

