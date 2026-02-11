// @ts-check

import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";
import { encodeHTML } from "../common/html.js";
import fs from "node:fs";

/**
 * @typedef {import("../fetchers/types").StatsData} StatsData
 * @typedef {import("../fetchers/types").TopLangData} TopLangData
 */

const BH_PNG_DATA_URI = (() => {
  if (process.env.NODE_ENV === "test") return null;
  try {
    const buf = fs.readFileSync(
      new URL("./telemetry-assets/blackhole.png", import.meta.url),
    );
    if (!buf || buf.length < 32) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
})();

/**
 * @param {string | undefined | null} value
 * @returns {"sun" | "star" | "moon"}
 */
const resolveScene = (value) => {
  const s = typeof value === "string" ? value.toLowerCase() : "";
  if (s.includes("blackhole") || s.includes("hole")) {
    // Backward compatibility for old URLs that still send blackhole.
    return "star";
  }
  if (s.includes("sun")) {
    return "sun";
  }
  if (s.includes("moon")) {
    return "moon";
  }
  if (s.includes("star")) {
    return "star";
  }

  const hour = new Date().getUTCHours();
  const bucket = Math.max(0, Math.min(2, Math.floor(hour / 8)));
  return /** @type {const} */ (["sun", "star", "moon"][bucket]);
};

/**
 * @param {string | string[]} bgColor
 * @returns {{defs: string, fill: string}}
 */
const renderBg = (bgColor) => {
  if (!Array.isArray(bgColor)) {
    return { defs: "", fill: bgColor };
  }

  const [angle, ...stops] = bgColor;
  const defs = `
    <linearGradient
      id="bgGradient"
      gradientTransform="rotate(${angle})"
      gradientUnits="userSpaceOnUse"
    >
      ${stops
        .map((hex, i) => {
          const offset = (i * 100) / Math.max(1, stops.length - 1);
          return `<stop offset="${offset}%" stop-color="#${hex}" />`;
        })
        .join("\n")}
    </linearGradient>
  `;

  return { defs, fill: "url(#bgGradient)" };
};

/**
 * @param {TopLangData} topLangs
 * @param {number} count
 * @returns {{name: string, color: string | null, pct: number}[]}
 */
const getLangRows = (topLangs, count) => {
  const safeCount = Number.isFinite(count) ? count : 6;
  const limit = Math.max(1, Math.min(10, safeCount));

  const rows = Object.values(topLangs || {})
    .map((l) => {
      if (!l) {
        return null;
      }
      const size = typeof l.size === "number" ? l.size : Number(l.size);
      return { ...l, size };
    })
    .filter((l) => l && Number.isFinite(l.size) && l.size > 0)
    .sort((a, b) => b.size - a.size);

  const slice = rows.slice(0, limit);
  const total = slice.reduce((acc, l) => acc + l.size, 0) || 1;
  return slice.map((l) => ({
    name: l.name,
    color: l.color || null,
    pct: (l.size / total) * 100,
  }));
};

/**
 * Compact long language names so the STACK legend stays readable.
 * @param {string} name
 * @returns {string}
 */
const compactLangName = (name) => {
  const n = String(name || "").trim();
  if (!n) return "Unknown";

  const known = {
    TypeScript: "TS",
    JavaScript: "JS",
    "Jupyter Notebook": "Jupyter NB",
    "Objective-C++": "ObjC++",
    "Objective-C": "ObjC",
    "Visual Basic .NET": "VB.NET",
    "Emacs Lisp": "Elisp",
  };
  if (known[n]) return known[n];

  if (n.length <= 14) return n;

  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0];
    const rest = words
      .slice(1)
      .map((w) => (w && /[A-Za-z0-9]/.test(w[0]) ? w[0].toUpperCase() : ""))
      .join("");
    const compact = `${first} ${rest}`.trim();
    if (compact && compact.length <= 14) return compact;
  }

  return n.length <= 16 ? n : `${n.slice(0, 13).trim()}...`;
};

/**
 * @param {StatsData} stats
 * @param {TopLangData} topLangs
 * @param {object} options
 * @param {string=} options.title_color
 * @param {string=} options.text_color
 * @param {string=} options.icon_color
 * @param {string=} options.bg_color
 * @param {string=} options.border_color
 * @param {string=} options.theme
 * @param {string=} options.card_style
 * @param {number=} options.card_width
 * @param {number=} options.card_height
 * @param {number=} options.border_radius
 * @param {boolean=} options.hide_border
 * @param {boolean=} options.disable_animations
 * @param {number=} options.langs_count
 * @returns {string}
 */
const renderTelemetryCard = (stats, topLangs, options = {}) => {
  const {
    title_color,
    text_color,
    icon_color,
    bg_color,
    border_color,
    theme,
    card_style,
    card_width = 900,
    card_height = 360,
    border_radius = 18,
    hide_border = true,
    disable_animations = false,
    langs_count = 6,
  } = options;

  const scene = resolveScene(card_style);

  const colors = getCardColors({
    title_color,
    text_color,
    icon_color,
    bg_color,
    border_color,
    ring_color: undefined,
    theme,
  });

  const { defs: bgDefs, fill: bgFill } = renderBg(colors.bgColor);

  const W = Math.max(640, Math.min(1200, Number(card_width) || 900));
  const H = Math.max(320, Math.min(520, Number(card_height) || 360));
  const R = Math.max(0, Math.min(40, Number(border_radius) || 18));

  const P = 38;
  const frameInset = Math.max(12, Math.round(P * 0.55));
  const frameCornerLen = 20;
  const leftW = Math.round(W * 0.52);
  const objCx = Math.round(W * 0.8);
  const objCy = Math.round(H * 0.57);
  const objR = Math.max(112, Math.min(160, Math.round(W * 0.16)));
  const bhFrame = Math.round(objR * 3.55);

  const hudGreen = "#39ff14";
  const hudDim = colors.textColor;
  const hudLine = colors.borderColor;

  const rawName = String(stats?.name || "").trim();
  const clippedName =
    rawName.length > 18 ? `${rawName.slice(0, 18).trim()}...` : rawName;
  const name = encodeHTML(clippedName);

  const metrics = [
    { k: "Stars", v: stats.totalStars },
    { k: "Commits", v: stats.totalCommits },
    { k: "PRs", v: stats.totalPRs },
    { k: "Issues", v: stats.totalIssues },
    { k: "Reviews", v: stats.totalReviews },
    { k: "Contrib", v: stats.contributedTo },
  ];

  const tiles = (() => {
    const colGap = 18;
    const rowGap = 12;
    const cols = 3;
    const tileW = Math.floor((leftW - colGap * (cols - 1)) / cols);
    const tileH = 54;
    const baseX = P;
    const baseY = 154;

    return metrics
      .map((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = baseX + col * (tileW + colGap);
        const y = baseY + row * (tileH + rowGap);
        const value =
          typeof m.v === "number" ? String(kFormatter(m.v)) : String(m.v ?? "");

        return `
          <g class="tile" transform="translate(${x}, ${y})">
            <rect class="tile__bg" x="0" y="0" width="${tileW}" height="${tileH}" rx="14" />
            <text class="tile__k" x="16" y="24">${m.k.toUpperCase()}</text>
            <text class="tile__v" x="16" y="48">${value}</text>
          </g>
        `;
      })
      .join("\n");
  })();

  const langRows = getLangRows(topLangs, langs_count);
  const stack = (() => {
    const candidates = langRows.slice(0, 8);

    const chipH = 24;
    const padX = 12;
    const gapX = 10;
    const pctSlot = 40;

    // Keep chips in the left HUD zone so they never clash with the scene object.
    const maxW = leftW;

    const y = H - P - chipH;
    let x = P;

    const estimateW = (label) => {
      // Rough glyph width estimate for 11px UI sans text.
      const t = String(label || "");
      return Math.round(7.0 * t.length);
    };

    /** @type {{row: {name: string, color: string | null, pct: number}, w: number, label: string, pctLabel: string}[]} */
    const placed = [];

    for (const row of candidates) {
      const label = compactLangName(row.name);
      const pctLabel = `${Math.max(0, Math.min(100, Math.round(row.pct)))}%`;
      const w = 10 + padX * 2 + estimateW(label) + pctSlot;
      if (x !== P && x + w > P + maxW) break;
      placed.push({ row, w, label, pctLabel });
      x += w + gapX;
    }

    const remaining = Math.max(0, candidates.length - placed.length);
    const plusLabel = remaining > 0 ? `+${remaining}` : "";
    const plusW = plusLabel ? 10 + padX * 2 + estimateW(plusLabel) : 0;
    const showPlus = Boolean(plusLabel && x !== P && x + plusW <= P + maxW);

    const legend = placed.map((p) => p.row);

    if (!candidates.length) {
      return {
        legend,
        svg: `
          <g class="stack" transform="translate(${P}, ${H - P - chipH})">
            <text class="chip__empty" x="0" y="16">STACK · NO DATA</text>
          </g>
        `,
      };
    }

    let x2 = P;
    const items = placed
      .map((pItem) => {
        const label = pItem.label;
        const pctLabel = pItem.pctLabel;
        const w = pItem.w;
        const color = pItem.row.color || colors.titleColor;
        const out = `
          <g class="chip" transform="translate(${x2}, ${y})">
            <rect class="chip__bg" x="0" y="0" width="${w}" height="${chipH}" rx="999" />
            <circle class="chip__dot" cx="${padX}" cy="${Math.round(
          chipH / 2,
        )}" r="4" fill="${color}" />
            <text class="chip__txt" x="${padX + 12}" y="${Math.round(
          chipH / 2 + 4,
        )}">${encodeHTML(label)}</text>
            <text class="chip__pct" x="${w - padX}" y="${Math.round(
          chipH / 2 + 4,
        )}" text-anchor="end">${encodeHTML(pctLabel)}</text>
          </g>
        `;
        x2 += w + gapX;
        return out;
      })
      .join("\n");

    const plus = showPlus
      ? (() => {
          const w = plusW;
          const out = `
            <g class="chip" transform="translate(${x2}, ${y})">
              <rect class="chip__bg" x="0" y="0" width="${w}" height="${chipH}" rx="999" />
              <circle class="chip__dot" cx="${padX}" cy="${Math.round(
            chipH / 2,
          )}" r="4" fill="${colors.titleColor}" />
              <text class="chip__txt" x="${padX + 12}" y="${Math.round(
            chipH / 2 + 4,
          )}">${encodeHTML(plusLabel)}</text>
            </g>
          `;
          return out;
        })()
      : "";

    return {
      legend,
      svg: `
        <g class="stack">
          <text class="h2" x="${P}" y="${H - P - chipH - 10}">STACK</text>
          ${items}
          ${plus}
        </g>
      `,
    };
  })();

  const stackChips = stack.svg;
  const legendRows = stack.legend;

  const sceneObj = (() => {
    const cx = objCx;
    const cy = objCy;
    const r = objR;

    if (scene === "sun") {
      return `
        <g class="obj obj--sun" transform="translate(${cx}, ${cy})">
          <circle class="sun__halo" r="${r + 26}" fill="url(#sp-sun)" opacity="0.32" />
          <circle class="sun__core" r="${r}" fill="url(#sp-sun)" opacity="0.88" />
          <g class="sun__flares">
            <path d="M0 ${-r - 10} L0 ${-r - 40}" />
            <path d="M${r + 10} 0 L${r + 42} 0" />
            <path d="M0 ${r + 10} L0 ${r + 40}" />
            <path d="M${-r - 10} 0 L${-r - 42} 0" />
          </g>
        </g>
      `;
    }

    if (scene === "moon") {
      return `
        <g class="obj obj--moon" transform="translate(${cx}, ${cy})">
          <circle r="${r}" fill="url(#sp-moon)" opacity="0.72" />
          <circle r="${r}" fill="url(#sp-craters)" opacity="0.22" />
          <circle r="${r}" fill="none" stroke="${colors.borderColor}" stroke-opacity="0.14" stroke-width="4" />
        </g>
      `;
    }

    if (scene === "star") {
      const ray = Math.max(34, Math.round(r * 0.42));
      const core = Math.max(10, Math.round(ray * 0.32));
      return `
        <g class="obj obj--star" transform="translate(${cx}, ${cy})">
          <circle r="${ray + 18}" fill="url(#sp-star)" opacity="0.16" />
          <circle r="${core}" fill="url(#sp-star)" opacity="0.95" />
          <g class="star__rays">
            <path d="M0 ${-ray} L0 ${ray}" />
            <path d="M${-ray} 0 L${ray} 0" />
            <path d="M${-Math.round(ray * 0.72)} ${-Math.round(ray * 0.72)} L${Math.round(ray * 0.72)} ${Math.round(ray * 0.72)}" />
            <path d="M${-Math.round(ray * 0.72)} ${Math.round(ray * 0.72)} L${Math.round(ray * 0.72)} ${-Math.round(ray * 0.72)}" />
          </g>
        </g>
      `;
    }

    // blackhole default
    const orbit = (() => {
      const rx = r * 1.85;
      const ry = r * 0.64;

      const toRad = (deg) => (deg * Math.PI) / 180;
      const p = (deg) => {
        const a = toRad(deg);
        const x = rx * Math.cos(a);
        const y = ry * Math.sin(a);
        return { x, y };
      };

      // Keep the language HUD on the right side so it never intrudes into the left panel.
      // (Also avoids the “floating bars” feel when the orbit animates.)
      const start = -78;
      const end = 78;
      const span = end - start;
      const gap = 1.8;

      const sTrack = p(start);
      const eTrack = p(end);
      const largeTrack = span > 180 ? 1 : 0;
      const arcTrack = `<path class="orbit__track" d="M ${sTrack.x.toFixed(
        2,
      )} ${sTrack.y.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(
        2,
      )} 0 ${largeTrack} 1 ${eTrack.x.toFixed(2)} ${eTrack.y.toFixed(2)}" />`;

      const arcSegments = (() => {
        if (!legendRows.length) return "";
        let a0 = start;

        return legendRows
          .slice(0, 6)
          .map((l, idx) => {
            const pct = Math.max(0, Math.min(100, l.pct));
            const seg = (pct / 100) * span;
            const a1 = a0 + Math.max(0, seg - gap);
            const s = p(a0);
            const e = p(a1);
            const large = a1 - a0 > 180 ? 1 : 0;
            const c = l.color || colors.titleColor;
            const path = `M ${s.x.toFixed(2)} ${s.y.toFixed(
              2,
            )} A ${rx.toFixed(2)} ${ry.toFixed(
              2,
            )} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;

            a0 = a0 + seg;

            return `<path class="orbit__seg orbit__seg--${idx}" d="${path}" stroke="${c}" />`;
          })
          .join("\n");
      })();

      return { arcTrack, arcSegments };
    })();

    const usePng = Boolean(BH_PNG_DATA_URI);
    const body = usePng
      ? (() => {
          const frame = bhFrame;
          const x0 = -Math.round(frame / 2);
          const y0 = -Math.round(frame / 2);
          return `
            <g class="bhpng" opacity="0.96">
              <image href="${BH_PNG_DATA_URI}" x="${x0}" y="${y0}" width="${frame}" height="${frame}" preserveAspectRatio="xMidYMid meet" />
            </g>
          `;
        })()
      : `
        <g class="bh__diskTilt" transform="rotate(-10)">
          <g class="bh__diskGlow">
            <ellipse rx="${Math.round(r * 1.95)}" ry="${Math.round(
          r * 0.52,
        )}" fill="none" stroke="url(#bh-disk)" stroke-width="18" stroke-linecap="round" opacity="0.18" />
          </g>
          <g class="bh__disk" filter="url(#bh-diskNoise)">
            <ellipse rx="${Math.round(r * 1.95)}" ry="${Math.round(
          r * 0.52,
        )}" fill="none" stroke="url(#bh-disk)" stroke-width="10" stroke-linecap="round" opacity="0.92" />
            <ellipse rx="${Math.round(r * 1.55)}" ry="${Math.round(
          r * 0.36,
        )}" fill="none" stroke="url(#bh-disk)" stroke-width="6" stroke-linecap="round" opacity="0.72" />
            <ellipse rx="${Math.round(r * 1.22)}" ry="${Math.round(
          r * 0.28,
        )}" fill="none" stroke="url(#bh-diskCool)" stroke-width="3" stroke-linecap="round" opacity="0.5" />
          </g>

          <g class="bh__dust">
            ${(() => {
              const rx = r * 2.15;
              const ry = r * 0.58;
              const angles = [
                -2.7,
                -2.05,
                -1.55,
                -1.15,
                -0.62,
                -0.12,
                0.28,
                0.72,
                1.22,
                1.78,
                2.18,
                2.58,
              ];
              return angles
                .map((a, i) => {
                  const x = (Math.cos(a) * rx).toFixed(1);
                  const y = (Math.sin(a) * ry).toFixed(1);
                  const rr = (1.2 + (i % 3) * 0.7).toFixed(1);
                  const op = (0.16 + (i % 4) * 0.06).toFixed(2);
                  const delay = `${i * 220}ms`;
                  return `<circle class="bh__dustPt" cx="${x}" cy="${y}" r="${rr}" style="opacity:${op};animation-delay:${delay}" />`;
                })
                .join("\n");
            })()}
          </g>
        </g>

        <g class="bh__core">
          <circle class="bh__rim" r="${Math.round(r * 1.06)}" fill="url(#bh-rim)" opacity="0.88" />
          <circle class="bh__void" r="${Math.round(r * 0.78)}" fill="#000000" opacity="0.95" />
          <circle class="bh__hole" r="${Math.round(r * 0.62)}" fill="#000000" opacity="0.98" />
          <circle class="bh__photon" r="${Math.round(r * 0.9)}" fill="none" stroke="url(#bh-photon)" stroke-width="7" opacity="0.85" />
        </g>
      `;

    return `
      <g class="obj obj--hole" transform="translate(${cx}, ${cy})">
        <circle class="bh__halo" r="${Math.round(r * 1.9)}" fill="url(#bh-halo)" opacity="${
          usePng ? "0.5" : "0.8"
        }" />
        ${body}

        <g class="hole__orbits">
          ${orbit.arcTrack}
          ${orbit.arcSegments}
        </g>

        <g class="bh__fx" opacity="0.92">
          <ellipse class="bh__dash bh__dash--a" rx="${Math.round(
            r * 1.88,
          )}" ry="${Math.round(r * 0.66)}" />
          <ellipse class="bh__dash bh__dash--b" rx="${Math.round(
            r * 1.88,
          )}" ry="${Math.round(r * 0.66)}" />
          <ellipse class="bh__dash bh__dash--c" rx="${Math.round(
            r * 1.06,
          )}" ry="${Math.round(r * 0.96)}" />
        </g>

        <path class="bh__lensing" d="M${-Math.round(r * 1.22)} ${-Math.round(
          r * 0.1,
        )} C${-Math.round(r * 0.36)} ${-Math.round(r * 0.62)}, ${Math.round(
          r * 0.36,
        )} ${-Math.round(r * 0.62)}, ${Math.round(r * 1.22)} ${-Math.round(
          r * 0.1,
        )}" />
      </g>
    `;
  })();

  const stars = (() => {
    // Fixed star positions; deterministic and lightweight.
    const pts = [
      [0.08, 0.18, 1.2],
      [0.14, 0.58, 0.9],
      [0.22, 0.33, 1.6],
      [0.31, 0.14, 0.8],
      [0.38, 0.46, 1.1],
      [0.47, 0.22, 0.7],
      [0.58, 0.36, 1.4],
      [0.66, 0.16, 1.0],
      [0.74, 0.44, 0.8],
      [0.82, 0.28, 1.3],
      [0.90, 0.56, 0.9],
      [0.63, 0.72, 1.2],
      [0.78, 0.70, 1.0],
      [0.92, 0.22, 1.0],
      [0.10, 0.78, 0.9],
    ];
    return pts
      .map(([xr, yr, r], i) => {
        const cx = (W * xr).toFixed(2);
        const cy = (H * yr).toFixed(2);
        const delay = `${i * 260}ms`;
        const cls = i % 3 === 0 ? "st st--b" : "st";
        return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" style="animation-delay:${delay}" />`;
      })
      .join("\n");
  })();

  const style = `
    :host { font-synthesis: none; }

    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

    .kicker {
      font: 700 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudDim};
      opacity: 0.78;
      letter-spacing: 0.32em;
      text-transform: uppercase;
    }

    .hero {
      font: 800 38px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${colors.titleColor};
      letter-spacing: -0.02em;
      filter: drop-shadow(0 0 18px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 22px rgba(207, 163, 85, 0.10));
    }

    .hdr {
      font: 800 18px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${colors.titleColor};
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .sub {
      font: 600 12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${hudDim};
      opacity: 0.72;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .h2 {
      font: 800 13px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${colors.titleColor};
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .tile__bg {
      fill: rgba(0, 0, 0, 0.18);
      stroke: ${hudLine};
      stroke-opacity: 0.24;
      stroke-width: 1;
    }

    .tile__k {
      font: 700 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudDim};
      opacity: 0.78;
      letter-spacing: 0.20em;
      text-transform: uppercase;
    }

    .tile__v {
      font: 900 20px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudGreen};
      letter-spacing: 0.08em;
      filter: drop-shadow(0 0 7px rgba(57, 255, 20, 0.55));
      font-variant-numeric: tabular-nums;
    }

    .chip__bg {
      fill: rgba(0, 0, 0, 0.24);
      stroke: ${hudLine};
      stroke-opacity: 0.22;
      stroke-width: 1;
    }
    .chip__txt {
      font: 650 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${colors.textColor};
      opacity: 0.86;
      letter-spacing: 0.02em;
    }
    .chip__pct {
      font: 850 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudDim};
      opacity: 0.72;
      letter-spacing: 0.12em;
      font-variant-numeric: tabular-nums;
    }
    .chip__empty {
      font: 650 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      fill: ${colors.textColor};
      opacity: 0.72;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .st { fill: ${colors.textColor}; opacity: 0.22; animation: tw 3.0s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .st--b { fill: ${colors.textColor}; opacity: 0.34; }

    .grid {
      opacity: 0.65;
      mix-blend-mode: overlay;
    }

    .scan {
      opacity: 0.6;
      animation: scan 6.5s linear infinite;
    }

    .obj { filter: url(#sp-glow); }
    .hole__orbits {
      opacity: 0.92;
      transform-box: fill-box;
      transform-origin: center;
      animation: bhPrecess 12s ease-in-out infinite;
    }
    .orbit__track { fill: none; stroke: ${hudLine}; stroke-opacity: 0.14; stroke-width: 10; }
    .orbit__seg { fill: none; stroke-width: 10; stroke-linecap: round; filter: drop-shadow(0 0 10px rgba(207, 163, 85, 0.12)); }

    .bh__halo {
      filter: drop-shadow(0 0 26px rgba(207, 163, 85, 0.08));
    }

    .bhpng {
      transform-box: fill-box;
      transform-origin: center;
      filter: drop-shadow(0 0 34px rgba(207, 163, 85, 0.12));
    }

    .bh__diskGlow,
    .bh__disk,
    .bh__dust,
    .bh__photon {
      transform-box: fill-box;
      transform-origin: center;
    }

    .bh__diskGlow {
      animation: bhSpin 26s linear infinite;
    }

    .bh__disk {
      animation: bhSpin 14s linear infinite;
    }

    .bh__dust {
      animation: bhSpin 9s linear infinite reverse;
    }

    .bh__dustPt {
      fill: ${colors.iconColor};
      opacity: 0.32;
      animation: tw 2.8s ease-in-out infinite;
      filter: drop-shadow(0 0 12px rgba(207, 163, 85, 0.14));
    }

    .bh__photon {
      opacity: 0.85;
      animation: pulse 3.8s ease-in-out infinite;
      filter: drop-shadow(0 0 22px rgba(207, 163, 85, 0.18));
    }

    .bh__lensing {
      fill: none;
      stroke: url(#bh-lens);
      stroke-opacity: 0.55;
      stroke-width: 4.2;
      stroke-linecap: round;
      animation: pulse 4.4s ease-in-out infinite;
    }

    .bh__dash {
      fill: none;
      stroke: ${colors.titleColor};
      stroke-linecap: round;
      filter: drop-shadow(0 0 16px rgba(207, 163, 85, 0.18));
    }

    .bh__dash--a {
      stroke: ${colors.titleColor};
      stroke-opacity: 0.72;
      stroke-width: 7;
      stroke-dasharray: 170 1400;
      animation: bhDash 6.8s linear infinite;
    }

    .bh__dash--b {
      stroke: ${colors.iconColor};
      stroke-opacity: 0.52;
      stroke-width: 4;
      stroke-dasharray: 110 1400;
      animation: bhDash 9.6s linear infinite reverse;
    }

    .bh__dash--c {
      stroke: ${hudGreen};
      stroke-opacity: 0.32;
      stroke-width: 5;
      stroke-dasharray: 120 1400;
      animation: bhDash 8.2s linear infinite;
    }

    .sun__flares path { stroke: ${colors.iconColor}; stroke-opacity: 0.55; stroke-width: 4.2; stroke-linecap: round; animation: fl 3.4s ease-in-out infinite; }
    .star__rays path { stroke: ${colors.titleColor}; stroke-opacity: 0.42; stroke-width: 4.0; stroke-linecap: round; }

    @keyframes tw {
      0%, 100% { opacity: 0.18; transform: scale(0.95); }
      50% { opacity: 0.68; transform: scale(1.06); }
    }
    @keyframes scan {
      from { transform: translateY(${-H}px); }
      to { transform: translateY(${H * 2}px); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.22; transform: scale(0.99); }
      50% { opacity: 0.82; transform: scale(1.03); }
    }
    @keyframes fl {
      0%, 100% { stroke-opacity: 0.22; }
      50% { stroke-opacity: 0.85; }
    }
    @keyframes bhSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes bhPrecess {
      0%, 100% { transform: rotate(-8deg); }
      50% { transform: rotate(10deg); }
    }
    @keyframes bhDash {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -1400; }
    }
  `;

  const animKill =
    disable_animations || process.env.NODE_ENV === "test"
      ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
      : "";

  // Decorative HUD frame corners.
  const corners = `
    <path d="M${frameInset} ${frameInset + frameCornerLen}V${frameInset}H${frameInset + frameCornerLen}" />
    <path d="M${W - frameInset} ${frameInset + frameCornerLen}V${frameInset}H${W - frameInset - frameCornerLen}" />
    <path d="M${frameInset} ${H - frameInset - frameCornerLen}V${H - frameInset}H${frameInset + frameCornerLen}" />
    <path d="M${W - frameInset} ${H - frameInset - frameCornerLen}V${H - frameInset}H${W - frameInset - frameCornerLen}" />
  `;

  return `
    <svg
      width="${W}"
      height="${H}"
      viewBox="0 0 ${W} ${H}"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="titleId descId"
    >
      <title id="titleId">${name ? `${name}'s Telemetry` : "GitHub Telemetry"}</title>
      <desc id="descId">Stars: ${stats.totalStars}, Commits: ${stats.totalCommits}, PRs: ${stats.totalPRs}, Issues: ${stats.totalIssues}, Reviews: ${stats.totalReviews}, Contributed to: ${stats.contributedTo}. Top languages included.</desc>

      <defs>
        ${bgDefs}
        <clipPath id="clip">
          <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" />
        </clipPath>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="${hudLine}" stroke-opacity="0.12" stroke-width="1" />
        </pattern>

        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(57, 255, 20, 0)" />
          <stop offset="50%" stop-color="rgba(57, 255, 20, 0.10)" />
          <stop offset="100%" stop-color="rgba(57, 255, 20, 0)" />
        </linearGradient>

        <filter id="sp-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="bh-diskNoise" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.08" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <radialGradient id="bh-halo" cx="45%" cy="45%" r="72%">
          <stop offset="0%" stop-color="${colors.titleColor}" stop-opacity="0.26" />
          <stop offset="38%" stop-color="${colors.iconColor}" stop-opacity="0.10" />
          <stop offset="70%" stop-color="${colors.borderColor}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="bh-rim" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#000000" stop-opacity="0.88" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="bh-photon" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stop-color="${colors.iconColor}" stop-opacity="0" />
          <stop offset="55%" stop-color="${colors.iconColor}" stop-opacity="0.58" />
          <stop offset="85%" stop-color="${colors.titleColor}" stop-opacity="0.42" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <linearGradient id="bh-lens" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${colors.titleColor}" stop-opacity="0" />
          <stop offset="35%" stop-color="${colors.iconColor}" stop-opacity="0.55" />
          <stop offset="55%" stop-color="${colors.titleColor}" stop-opacity="0.52" />
          <stop offset="100%" stop-color="${colors.titleColor}" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="bh-disk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${colors.titleColor}" stop-opacity="0" />
          <stop offset="28%" stop-color="${colors.titleColor}" stop-opacity="0.62" />
          <stop offset="50%" stop-color="${colors.iconColor}" stop-opacity="0.92" />
          <stop offset="72%" stop-color="${colors.titleColor}" stop-opacity="0.62" />
          <stop offset="100%" stop-color="${colors.titleColor}" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="bh-diskCool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${hudGreen}" stop-opacity="0" />
          <stop offset="50%" stop-color="${hudGreen}" stop-opacity="0.42" />
          <stop offset="100%" stop-color="${hudGreen}" stop-opacity="0" />
        </linearGradient>

        <radialGradient id="sp-sun" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stop-color="${colors.iconColor}" stop-opacity="0.95" />
          <stop offset="55%" stop-color="${colors.titleColor}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="sp-moon" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stop-color="${colors.textColor}" stop-opacity="0.85" />
          <stop offset="55%" stop-color="${colors.borderColor}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <pattern id="sp-craters" width="34" height="34" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="14" r="2.7" fill="${colors.borderColor}" fill-opacity="0.22" />
          <circle cx="22" cy="10" r="2.0" fill="${colors.borderColor}" fill-opacity="0.16" />
          <circle cx="24" cy="24" r="3.0" fill="${colors.borderColor}" fill-opacity="0.18" />
          <circle cx="14" cy="28" r="1.8" fill="${colors.borderColor}" fill-opacity="0.14" />
        </pattern>

        <radialGradient id="sp-star" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${colors.textColor}" stop-opacity="0.95" />
          <stop offset="55%" stop-color="${colors.titleColor}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <g clip-path="url(#clip)">
        <rect x="0" y="0" width="${W}" height="${H}" fill="${bgFill}" />

        <rect class="grid" x="0" y="0" width="${W}" height="${H}" fill="url(#grid)" />
        <rect class="scan" x="0" y="${-H}" width="${W}" height="${H}" fill="url(#scan)" />

        <g class="stars">${stars}</g>
        ${sceneObj}

        <g class="hud">
          <text class="kicker" x="${P}" y="44">TELEMETRY SIGNAL</text>
          <text class="sub" x="${W - P}" y="44" text-anchor="end">SCENE · ${scene.toUpperCase()}</text>
          <text class="hero" x="${P}" y="90">${name || "UNKNOWN"}</text>
          <g class="sig" transform="translate(${P}, 112)">
            <path d="M0 0H138" stroke="${hudLine}" stroke-opacity="0.38" stroke-width="1" />
            <text class="kicker" x="150" y="4">HUD · ${scene.toUpperCase()}</text>
          </g>

          ${tiles}
          ${stackChips}

          <g class="frame" stroke="${hudLine}" stroke-width="1" fill="none" opacity="0.9">
            ${corners}
            <path d="M${P} 138H${W - P}" opacity="0.55" />
          </g>
        </g>
      </g>

      <rect
        x="0.5"
        y="0.5"
        rx="${R}"
        width="${W - 1}"
        height="${H - 1}"
        stroke="${colors.borderColor}"
        stroke-opacity="${hide_border ? 0 : 1}"
      />

      <style>
        ${style}
        ${animKill}
      </style>
    </svg>
  `;
};

export { renderTelemetryCard };
export default renderTelemetryCard;
