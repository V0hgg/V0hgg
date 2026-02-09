// @ts-check

import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";
import { encodeHTML } from "../common/html.js";

/**
 * @typedef {import("../fetchers/types").StatsData} StatsData
 * @typedef {import("../fetchers/types").TopLangData} TopLangData
 */

/**
 * @param {string | undefined | null} value
 * @returns {"blackhole" | "sun" | "star" | "moon"}
 */
const resolveScene = (value) => {
  const s = typeof value === "string" ? value.toLowerCase() : "";
  if (s.includes("blackhole") || s.includes("hole")) return "blackhole";
  if (s.includes("sun")) return "sun";
  if (s.includes("moon")) return "moon";
  if (s.includes("star")) return "star";

  const hour = new Date().getUTCHours();
  const bucket = Math.max(0, Math.min(3, Math.floor(hour / 6)));
  return /** @type {const} */ (["blackhole", "sun", "star", "moon"][bucket]);
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
      if (!l) return null;
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
  const leftW = Math.round(W * 0.52);
  const rightX = P + leftW + 28;
  const rightW = W - rightX - P;

  const hudGreen = "#39ff14";
  const hudDim = "rgba(231, 251, 255, 0.55)";
  const hudLine = "rgba(125, 249, 255, 0.16)";

  const name = encodeHTML(stats?.name || "");

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
    const rowGap = 16;
    const cols = 2;
    const tileW = Math.floor((leftW - colGap) / cols);
    const tileH = 70;
    const baseX = P;
    const baseY = 88;

    return metrics
      .map((m, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = baseX + col * (tileW + colGap);
        const y = baseY + row * (tileH + rowGap);
        const value =
          typeof m.v === "number" ? String(kFormatter(m.v)) : String(m.v ?? "");

        return `
          <g class="tile" transform="translate(${x}, ${y})">
            <rect class="tile__bg" x="0" y="0" width="${tileW}" height="${tileH}" rx="14" />
            <text class="tile__k" x="16" y="26">${m.k.toUpperCase()}</text>
            <text class="tile__v" x="16" y="56">${value}</text>
          </g>
        `;
      })
      .join("\n");
  })();

  const langRows = getLangRows(topLangs, langs_count);
  const langs = (() => {
    const headY = 96;
    const rowY0 = 126;
    const rowH = 32;
    const barH = 8;
    const barW = Math.max(220, Math.round(rightW - 120));

    return `
      <g class="langs" transform="translate(${rightX}, 0)">
        <text class="h2" x="0" y="${headY}">STACK</text>
        ${langRows.length
          ? langRows
              .map((l, idx) => {
                const y = rowY0 + idx * rowH;
                const pct = Math.max(0, Math.min(100, l.pct));
                const fillW = Math.max(2, Math.round((pct / 100) * barW));
                const c = l.color || colors.titleColor;
                return `
                  <g class="lang" transform="translate(0, ${y})">
                    <circle class="lang__dot" cx="4" cy="4" r="4" fill="${c}" />
                    <text class="lang__name" x="16" y="8">${encodeHTML(l.name)}</text>
                    <text class="lang__pct" x="${rightW}" y="8" text-anchor="end">${pct.toFixed(1)}%</text>
                    <rect class="lang__track" x="16" y="14" width="${barW}" height="${barH}" rx="999" />
                    <rect class="lang__fill" x="16" y="14" width="${fillW}" height="${barH}" rx="999" fill="${c}" />
                  </g>
                `;
              })
              .join("\n")
          : `<text class="lang__empty" x="0" y="${rowY0}">NO LANGUAGE DATA</text>`}
      </g>
    `;
  })();

  const sceneObj = (() => {
    const cx = Math.round(W * 0.79);
    const cy = Math.round(H * 0.58);
    const r = Math.max(110, Math.min(160, Math.round(W * 0.16)));

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
    return `
      <g class="obj obj--hole" transform="translate(${cx}, ${cy})">
        <g class="hole__disk">
          <ellipse rx="${Math.round(r * 1.9)}" ry="${Math.round(r * 0.46)}" fill="none" stroke="url(#sp-disk)" stroke-width="10" stroke-linecap="round" />
          <ellipse rx="${Math.round(r * 1.45)}" ry="${Math.round(r * 0.34)}" fill="none" stroke="url(#sp-disk)" stroke-width="6" stroke-linecap="round" opacity="0.75" />
        </g>
        <circle r="${Math.round(r * 0.95)}" fill="url(#sp-hole)" opacity="0.92" />
        <circle r="${Math.round(r * 0.64)}" fill="#000000" opacity="0.92" />
        <path class="hole__lensing" d="M${-Math.round(r * 1.18)} ${-Math.round(r * 0.16)} C${-Math.round(r * 0.35)} ${-Math.round(r * 0.56)}, ${Math.round(r * 0.35)} ${-Math.round(r * 0.56)}, ${Math.round(r * 1.18)} ${-Math.round(r * 0.16)}" />
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

    .hdr {
      font: 800 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${colors.titleColor};
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .sub {
      font: 600 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudDim};
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .h2 {
      font: 800 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${colors.titleColor};
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .tile__bg {
      fill: rgba(0, 0, 0, 0.25);
      stroke: ${hudLine};
      stroke-width: 1;
    }

    .tile__k {
      font: 700 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudDim};
      letter-spacing: 0.20em;
      text-transform: uppercase;
    }

    .tile__v {
      font: 900 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: ${hudGreen};
      letter-spacing: 0.08em;
      filter: drop-shadow(0 0 7px rgba(57, 255, 20, 0.55));
    }

    .lang__name, .lang__pct {
      font: 600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: rgba(231, 251, 255, 0.78);
    }

    .lang__empty {
      font: 600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      fill: rgba(231, 251, 255, 0.55);
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .lang__track {
      fill: rgba(255, 255, 255, 0.07);
      stroke: rgba(255, 255, 255, 0.06);
    }

    .lang__fill {
      filter: drop-shadow(0 0 10px rgba(125, 249, 255, 0.22));
    }

    .st { fill: rgba(231, 251, 255, 0.26); animation: tw 3.0s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .st--b { fill: rgba(231, 251, 255, 0.38); }

    .grid {
      opacity: 0.65;
      mix-blend-mode: overlay;
    }

    .scan {
      opacity: 0.6;
      animation: scan 6.5s linear infinite;
    }

    .obj { filter: url(#sp-glow); }
    .hole__disk { animation: spin 7.0s linear infinite; transform-origin: center; }
    .hole__lensing { fill: none; stroke: ${colors.titleColor}; stroke-opacity: 0.26; stroke-width: 4.2; stroke-linecap: round; animation: pulse 3.8s ease-in-out infinite; }

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
  `;

  const animKill =
    disable_animations || process.env.NODE_ENV === "test"
      ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
      : "";

  // Decorative HUD frame corners.
  const corners = `
    <path d="M${P} ${P + 18}V${P}H${P + 18}" />
    <path d="M${W - P} ${P + 18}V${P}H${W - P - 18}" />
    <path d="M${P} ${H - P - 18}V${H - P}H${P + 18}" />
    <path d="M${W - P} ${H - P - 18}V${H - P}H${W - P - 18}" />
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
          <path d="M28 0H0V28" fill="none" stroke="rgba(125, 249, 255, 0.10)" stroke-width="1" />
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

        <radialGradient id="sp-hole" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#000000" stop-opacity="0.88" />
          <stop offset="100%" stop-color="${colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <linearGradient id="sp-disk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${colors.titleColor}" stop-opacity="0" />
          <stop offset="45%" stop-color="${colors.titleColor}" stop-opacity="0.72" />
          <stop offset="55%" stop-color="${colors.iconColor}" stop-opacity="0.78" />
          <stop offset="100%" stop-color="${colors.iconColor}" stop-opacity="0" />
        </linearGradient>

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
          <text class="hdr" x="${P}" y="48">TELEMETRY</text>
          <text class="sub" x="${W - P}" y="48" text-anchor="end">SCENE · ${scene.toUpperCase()}</text>
          <text class="sub" x="${P}" y="70">USER · ${name || "UNKNOWN"}</text>

          ${tiles}
          ${langs}

          <g class="frame" stroke="${hudLine}" stroke-width="1" fill="none" opacity="0.9">
            ${corners}
            <path d="M${P} 80H${W - P}" opacity="0.55" />
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
