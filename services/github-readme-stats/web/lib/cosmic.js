/**
 * @typedef {"sun" | "star" | "moon"} Scene
 * @typedef {"auto" | Scene} SceneMode
 */

/**
 * @param {Date} [date]
 * @returns {Scene}
 */
export function resolveAutoScene(date = new Date()) {
  const hour = date.getUTCHours();
  const bucket = Math.max(0, Math.min(2, Math.floor(hour / 8)));
  return /** @type {const} */ (["sun", "star", "moon"][bucket]);
}

/**
 * @param {SceneMode} mode
 * @returns {Scene}
 */
export function resolveScene(mode) {
  if (mode === "sun" || mode === "star" || mode === "moon") return mode;
  // Backward compatibility for old persisted values.
  if (mode === "blackhole" || mode === "hole") return "star";
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
    default:
      return {
        accent: "#f3f2ed",
        accent2: "#cfa355",
        halo: "rgba(243, 242, 237, 0.20)",
        haze: "rgba(207, 163, 85, 0.05)",
      };
  }
}

/**
 * @param {Scene} scene
 * @returns {string}
 */
export function getSceneLabel(scene) {
  switch (scene) {
    case "sun":
      return "Sun";
    case "star":
      return "Star";
    case "moon":
      return "Moon";
  }
}
