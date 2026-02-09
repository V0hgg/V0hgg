import { resolveScene } from "./cosmic.js";

/**
 * @typedef {"auto" | "blackhole" | "sun" | "star" | "moon"} SceneMode
 */

function safeInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {SceneMode} mode
 * @returns {string}
 */
export function sceneModeToCardStyle(mode) {
  if (!mode || mode === "auto") return "space-auto";
  const scene = resolveScene(mode);
  // telemetry card resolver checks substrings (sun/star/moon/blackhole)
  return `space-${scene}`;
}

/**
 * @param {object} cfg
 * @param {string} cfg.username
 * @param {string} cfg.theme
 * @param {SceneMode} cfg.sceneMode
 * @param {number} cfg.cacheSeconds
 * @param {number} cfg.langsCount
 * @param {boolean} cfg.includeAllCommits
 * @param {boolean} cfg.hideBorder
 * @returns {string}
 */
export function buildTelemetryPath(cfg) {
  const p = new URLSearchParams();
  p.set("username", (cfg.username || "").trim() || "V0hgg");
  p.set("theme", cfg.theme || "space_time_gradient");
  p.set("card_style", sceneModeToCardStyle(cfg.sceneMode));
  p.set("cache_seconds", String(safeInt(cfg.cacheSeconds, 21600)));
  p.set("langs_count", String(safeInt(cfg.langsCount, 6)));
  p.set("include_all_commits", cfg.includeAllCommits ? "true" : "false");
  p.set("hide_border", cfg.hideBorder ? "true" : "false");
  return `/api/telemetry?${p.toString()}`;
}

/**
 * @param {string} origin e.g. https://example.com
 * @param {string} telemetryPath e.g. /api/telemetry?...
 * @returns {string}
 */
export function buildReadmeMarkdown(origin, telemetryPath) {
  const o = origin?.replace(/\/$/, "") || "";
  return `![GitHub Telemetry](${o}${telemetryPath})`;
}
