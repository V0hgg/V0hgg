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

const serviceRoot = path.resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);

const candidates = [
  path.join(serviceRoot, ".env.local"),
  path.join(serviceRoot, ".env"),
];

/**
 * Load `.env.local` / `.env` from the service root if they exist.
 * Does not override pre-existing env vars (e.g. those set by Vercel).
 */
export function loadDotenv() {
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    dotenv.config({ path: p, override: false });
  }
}

