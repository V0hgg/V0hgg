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
        accent: "#f2d7a0",
        accent2: "#cfa355",
        halo: "rgba(242, 215, 160, 0.22)",
        haze: "rgba(207, 163, 85, 0.07)",
      };
    case "moon":
      return {
        accent: "#b9b3a7",
        accent2: "#f2d7a0",
        halo: "rgba(185, 179, 167, 0.18)",
        haze: "rgba(242, 215, 160, 0.05)",
      };
    case "star":
      return {
        accent: "#f3f2ed",
        accent2: "#cfa355",
        halo: "rgba(243, 242, 237, 0.20)",
        haze: "rgba(207, 163, 85, 0.05)",
      };
    case "blackhole":
    default:
      return {
        accent: "#cfa355",
        accent2: "#f2d7a0",
        halo: "rgba(207, 163, 85, 0.20)",
        haze: "rgba(242, 215, 160, 0.06)",
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
