// @ts-check

/**
 * Local dev helper:
 * - `vercel dev` is often run from the repo root in a monorepo, while this package
 *   lives in `services/github-readme-stats`.
 * - The upstream code used `dotenv.config()` which only loads `./.env` from CWD.
 * This loader searches the service root for `.env.local` / `.env` and loads them
 * without overriding existing env vars.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

// This file lives at: services/github-readme-stats/src/common/load-dotenv.js
// packageRoot => services/github-readme-stats
// (src/common -> src -> packageRoot)
const packageRoot = path.resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);

// repoRoot => (monorepo) root folder that contains `services/`
const repoRoot = path.resolve(packageRoot, "..", "..");

const candidates = [
  // Prefer package-local envs if the user keeps secrets near the service.
  path.join(packageRoot, ".env.local"),
  path.join(packageRoot, ".env"),
  // Vercel CLI often writes `.env.local` at the repo root when linking/pulling envs.
  path.join(repoRoot, ".env.local"),
  path.join(repoRoot, ".env"),
];

let didLoad = false;

/**
 * Load `.env.local` / `.env` from the service root if they exist.
 * Does not override pre-existing env vars (e.g. those set by Vercel).
 */
export function loadDotenv() {
  if (didLoad) return;
  didLoad = true;

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    dotenv.config({ path: p, override: false, quiet: true });
  }
}
