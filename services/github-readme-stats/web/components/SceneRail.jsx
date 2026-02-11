import { getSceneLabel } from "../lib/cosmic.js";

const scenes = /** @type {const} */ ([
  { key: "auto", label: "Auto", icon: "⏱" },
  { key: "sun", label: "Sun", icon: "☼" },
  { key: "star", label: "Star", icon: "✶" },
  { key: "moon", label: "Moon", icon: "☾" },
]);

export default function SceneRail({ scene, mode, onModeChange }) {
  const activeLabel = getSceneLabel(scene);

  return (
    <section className="sceneRail" aria-label="Scene selector">
      <div className="sceneRail__head">
        <div>
          <div className="kicker">Celestial Cycle</div>
          <div className="sceneRail__title">
            Scene: <span className="sceneRail__scene">{activeLabel}</span>
          </div>
        </div>
        <div className="sceneRail__utc">UTC</div>
      </div>

      <div className="sceneRail__row" role="radiogroup" aria-label="Scene mode">
        {scenes.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`sceneBtn ${mode === s.key ? "is-on" : ""}`}
            role="radio"
            aria-checked={mode === s.key}
            onClick={() => onModeChange?.(s.key)}
          >
            <span className="sceneBtn__ic" aria-hidden="true">
              {s.icon}
            </span>
            <span className="sceneBtn__tx">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="sceneRail__legend" aria-hidden="true">
        <span>00-07 Sun</span>
        <span>08-15 Star</span>
        <span>16-23 Moon</span>
      </div>
    </section>
  );
}
