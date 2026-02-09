/**
 * @typedef {"blackhole" | "sun" | "star" | "moon"} Scene
 * @typedef {"auto" | Scene} SceneMode
 */

/**
 * @param {Date} [date]
 * @returns {Scene}
 */
export function resolveAutoScene(date = new Date()) {
  const hour = date.getUTCHours();
  const bucket = Math.max(0, Math.min(3, Math.floor(hour / 6)));
  return /** @type {const} */ (["blackhole", "sun", "star", "moon"][bucket]);
}

/**
 * @param {SceneMode} mode
 * @returns {Scene}
 */
export function resolveScene(mode) {
  if (mode && mode !== "auto") return mode;
  return resolveAutoScene();
}

/**
 * @param {Scene} scene
 * @returns {{ accent: string, accent2: string, halo: string, haze: string }}
 */
export function getScenePalette(scene) {
  switch (scene) {
    case "sun":
      return {
        accent: "#ffd37a",
        accent2: "#ff6ad5",
        halo: "rgba(255, 211, 122, 0.28)",
        haze: "rgba(255, 153, 80, 0.08)",
      };
    case "moon":
      return {
        accent: "#b7c7ff",
        accent2: "#7df9ff",
        halo: "rgba(183, 199, 255, 0.22)",
        haze: "rgba(125, 249, 255, 0.06)",
      };
    case "star":
      return {
        accent: "#7df9ff",
        accent2: "#39ff14",
        halo: "rgba(125, 249, 255, 0.22)",
        haze: "rgba(57, 255, 20, 0.05)",
      };
    case "blackhole":
    default:
      return {
        accent: "#7df9ff",
        accent2: "#ff4fd8",
        halo: "rgba(125, 249, 255, 0.22)",
        haze: "rgba(255, 79, 216, 0.06)",
      };
  }
}

/**
 * @param {Scene} scene
 * @returns {string}
 */
export function getSceneLabel(scene) {
  switch (scene) {
    case "blackhole":
      return "Black Hole";
    case "sun":
      return "Sun";
    case "star":
      return "Star";
    case "moon":
      return "Moon";
  }
}

