import { useCallback, useEffect, useMemo, useState } from "react";
import BlackHoleBackdrop from "./components/BlackHoleBackdrop.jsx";
import Tilt from "./components/Tilt.jsx";
import CopyButton from "./components/CopyButton.jsx";
import SceneRail from "./components/SceneRail.jsx";
import { getScenePalette, resolveScene } from "./lib/cosmic.js";
import { buildReadmeMarkdown, buildTelemetryPath } from "./lib/url.js";

const themeChoices = [
  { id: "space_time_gradient", label: "space_time_gradient (timestamp)" },
  { id: "space_blackhole_gradient", label: "space_blackhole_gradient" },
  { id: "space_sun_gradient", label: "space_sun_gradient" },
  { id: "space_star_gradient", label: "space_star_gradient" },
  { id: "space_moon_gradient", label: "space_moon_gradient" },
  { id: "dark", label: "dark" },
];

function safeInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const sync = () => setReducedMotion(Boolean(mq.matches));
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const [username, setUsername] = useState("V0hgg");
  const [theme, setTheme] = useState("space_blackhole_gradient");
  const [sceneMode, setSceneMode] = useState("blackhole");
  const [cacheSeconds, setCacheSeconds] = useState(21600);
  const [langsCount, setLangsCount] = useState(6);
  const [includeAllCommits, setIncludeAllCommits] = useState(true);
  const [hideBorder, setHideBorder] = useState(true);

  const [clockTick, setClockTick] = useState(0);
  const scene = useMemo(() => resolveScene(sceneMode), [sceneMode, clockTick]);

  // Refresh auto scene every minute so the UI stays in sync with UTC buckets.
  useEffect(() => {
    if (sceneMode !== "auto") return;
    const t = window.setInterval(() => setClockTick((v) => v + 1), 60_000);
    return () => window.clearInterval(t);
  }, [sceneMode]);

  useEffect(() => {
    const p = getScenePalette(scene);
    const root = document.documentElement;
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--accent2", p.accent2);
    root.style.setProperty("--halo", p.halo);
    root.style.setProperty("--haze", p.haze);
    document.body.dataset.scene = scene;
  }, [scene]);

  const telemetryPath = useMemo(() => {
    return buildTelemetryPath({
      username,
      theme,
      sceneMode,
      cacheSeconds,
      langsCount,
      includeAllCommits,
      hideBorder,
    });
  }, [
    username,
    theme,
    sceneMode,
    cacheSeconds,
    langsCount,
    includeAllCommits,
    hideBorder,
  ]);

  const previewSrc = useMemo(() => {
    // Bust browser cache on edits without affecting server cache.
    const b = Date.now().toString(36);
    return `${telemetryPath}&b=${b}`;
  }, [telemetryPath]);

  const origin = useMemo(() => window.location.origin, []);
  const snippet = useMemo(
    () => buildReadmeMarkdown(origin, telemetryPath),
    [origin, telemetryPath],
  );

  const randomize = useCallback(() => {
    const pick = themeChoices[Math.floor(Math.random() * themeChoices.length)];
    setTheme(pick.id);
  }, []);

  return (
    <div className="shell">
      <BlackHoleBackdrop reducedMotion={reducedMotion} />
      <div className="vignette" aria-hidden="true" />

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <div className="hero__kicker">Telemetry Lab</div>
            <h1 className="hero__name">
              <span className="hero__glow">{username || "V0hgg"}</span>
            </h1>
            <div className="hero__rail" aria-hidden="true">
              <span className="hero__line" />
              <span className="hero__tag">Readme Signal</span>
            </div>

            <div className="hero__actions">
              <a className="chip" href="#lab">
                Configure
              </a>
              <a className="chip" href={telemetryPath} target="_blank" rel="noreferrer">
                Open SVG
              </a>
              <button className="chip chip--ghost" type="button" onClick={randomize}>
                Randomize
              </button>
            </div>
          </div>

          <div className="hero__preview">
            <Tilt className="preview preview--hero">
              <div className="preview__frame">
                <img className="preview__img" src={previewSrc} alt="Telemetry preview" />
              </div>
            </Tilt>
          </div>
        </div>

        <div className="hero__scroll" aria-hidden="true">
          <div className="hero__scrollLeft">
            <div className="hero__scrollLine" />
            <div className="hero__scrollText">Scroll Down</div>
          </div>
          <div className="hero__scrollRight">
            <div className="hero__scrollBar" />
            <div className="hero__scrollDot" />
          </div>
        </div>
      </section>

      <main id="lab" className="app">
        <div className="top top--lab">
          <div className="brand">
            <div className="brand__badge" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="brand__text">
              <div className="kicker">Mission Control</div>
              <div className="brand__title">Configure your mega-card</div>
            </div>
          </div>
          <nav className="nav">
            <a className="chip" href="/upstream" target="_blank" rel="noreferrer">
              Upstream
            </a>
          </nav>
        </div>

        <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <div>
              <div className="kicker">Mission Control</div>
              <h2 className="h2">Configure</h2>
            </div>
            <div className="pill mono">CACHE: 6H</div>
          </div>

          <div className="form">
            <label className="field">
              <div className="field__label">GitHub username</div>
              <input
                className="field__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </label>

            <div className="row">
              <label className="field">
                <div className="field__label">Theme</div>
                <select
                  className="field__input"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {themeChoices.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <div className="field__label">Cache (seconds)</div>
                <input
                  className="field__input mono"
                  value={cacheSeconds}
                  onChange={(e) => setCacheSeconds(safeInt(e.target.value, 21600))}
                  inputMode="numeric"
                />
              </label>
            </div>

            <SceneRail scene={scene} mode={sceneMode} onModeChange={setSceneMode} />

            <div className="row">
              <label className="toggle">
                <input
                  checked={includeAllCommits}
                  onChange={(e) => setIncludeAllCommits(e.target.checked)}
                  type="checkbox"
                />
                <span className="toggle__ui" aria-hidden="true" />
                <span className="toggle__label">Include all commits</span>
              </label>

              <label className="field">
                <div className="field__label">Lang count</div>
                <input
                  className="field__input mono"
                  value={langsCount}
                  onChange={(e) => setLangsCount(safeInt(e.target.value, 6))}
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="row">
              <label className="toggle">
                <input
                  checked={hideBorder}
                  onChange={(e) => setHideBorder(e.target.checked)}
                  type="checkbox"
                />
                <span className="toggle__ui" aria-hidden="true" />
                <span className="toggle__label">Hide border</span>
              </label>
            </div>
          </div>

          <div className="panel__foot">
            <CopyButton text={snippet} label="Copy README Snippet" copiedLabel="Copied" />
            <button
              className="btn"
              type="button"
              onClick={() => window.open(telemetryPath, "_blank", "noopener,noreferrer")}
            >
              Open Card
            </button>
          </div>
        </section>

        <section className="panel panel--preview">
          <div className="panel__head">
            <div>
              <div className="kicker">Holo Readout</div>
              <h2 className="h2">Preview</h2>
            </div>
            <div className="pill mono">SCENE: {scene.toUpperCase()}</div>
          </div>

          <Tilt className="preview">
            <div className="preview__frame">
              <img className="preview__img" src={previewSrc} alt="Telemetry preview" />
            </div>
          </Tilt>

          <div className="code">
            <div className="code__head">
              <div>
                <div className="kicker">README</div>
                <div className="code__title">Snippet</div>
              </div>
              <CopyButton text={snippet} />
            </div>
            <pre className="code__box">
              <code className="mono">{snippet}</code>
            </pre>
          </div>
        </section>
        </div>
      </main>

      <footer className="foot">
        <div className="muted">
          Profile card endpoint: <span className="mono">{telemetryPath}</span>
        </div>
      </footer>
    </div>
  );
}
