// @ts-check

import { encodeHTML } from "./html.js";
import { flexLayout } from "./render.js";

class Card {
  /**
   * Creates a new card instance.
   *
   * @param {object} args Card arguments.
   * @param {number=} args.width Card width.
   * @param {number=} args.height Card height.
   * @param {number=} args.border_radius Card border radius.
   * @param {string=} args.customTitle Card custom title.
   * @param {string=} args.defaultTitle Card default title.
   * @param {string=} args.titlePrefixIcon Card title prefix icon.
   * @param {object} [args.colors={}] Card colors arguments.
   * @param {string=} args.colors.titleColor Card title color.
   * @param {string=} args.colors.textColor Card text color.
   * @param {string=} args.colors.iconColor Card icon color.
   * @param {string|string[]=} args.colors.bgColor Card background color.
   * @param {string=} args.colors.borderColor Card border color.
   */
  constructor({
    width = 100,
    height = 100,
    border_radius = 4.5,
    colors = {},
    customTitle,
    defaultTitle = "",
    titlePrefixIcon,
  }) {
    this.width = width;
    this.height = height;

    this.hideBorder = false;
    this.hideTitle = false;

    this.border_radius = border_radius;

    // returns theme based colors with proper overrides and defaults
    this.colors = colors;
    this.title =
      customTitle === undefined
        ? encodeHTML(defaultTitle)
        : encodeHTML(customTitle);

    this.css = "";

    this.paddingX = 25;
    this.paddingY = 35;
    this.titlePrefixIcon = titlePrefixIcon;
    this.animations = true;
    this.a11yTitle = "";
    this.a11yDesc = "";

    // Optional visual variant that can add decorative layers/animations.
    // Example: "space"
    this.cardStyle = "";
  }

  /**
   * @returns {void}
   */
  disableAnimations() {
    this.animations = false;
  }

  /**
   * @param {Object} props The props object.
   * @param {string} props.title Accessibility title.
   * @param {string} props.desc Accessibility description.
   * @returns {void}
   */
  setAccessibilityLabel({ title, desc }) {
    this.a11yTitle = title;
    this.a11yDesc = desc;
  }

  /**
   * @param {string} value The CSS to add to the card.
   * @returns {void}
   */
  setCSS(value) {
    this.css = value;
  }

  /**
   * @param {string | undefined | null} value Card style/variant.
   * @returns {void}
   */
  setCardStyle(value) {
    if (typeof value !== "string") {
      this.cardStyle = "";
      return;
    }
    const normalized = value.toLowerCase().trim();
    if (!normalized || normalized === "none" || normalized === "off") {
      this.cardStyle = "";
      return;
    }
    // Remove unsupported/old style tokens to keep backwards compatibility.
    // (We only support space styling in this fork.)
    this.cardStyle = normalized.replaceAll("arcade", "").replaceAll("__", "_");
  }

  /**
   * Resolves the active "space scene" (celestial variant) for the card.
   *
   * Rules:
   * - If the style string contains a known scene token, lock to it.
   * - Otherwise choose deterministically based on the current timestamp in 6-hour buckets.
   *
   * @returns {"blackhole" | "sun" | "star" | "moon"} Scene name.
   */
  resolveSpaceScene() {
    const s = this.cardStyle || "";
    if (s.includes("blackhole") || s.includes("hole")) return "blackhole";
    if (s.includes("sun")) return "sun";
    if (s.includes("moon")) return "moon";
    if (s.includes("star")) return "star";

    const hour = new Date().getUTCHours();
    const bucket = Math.max(0, Math.min(3, Math.floor(hour / 6)));
    // 00-05 UTC: blackhole, 06-11 UTC: sun, 12-17 UTC: star, 18-23 UTC: moon
    return /** @type {const} */ (["blackhole", "sun", "star", "moon"][bucket]);
  }

  /**
   * @param {boolean} value Whether to hide the border or not.
   * @returns {void}
   */
  setHideBorder(value) {
    this.hideBorder = value;
  }

  /**
   * @param {boolean} value Whether to hide the title or not.
   * @returns {void}
   */
  setHideTitle(value) {
    this.hideTitle = value;
    if (value) {
      this.height -= 30;
    }
  }

  /**
   * @param {string} text The title to set.
   * @returns {void}
   */
  setTitle(text) {
    this.title = text;
  }

  /**
   * @returns {string} The rendered card title.
   */
  renderTitle() {
    const titleText = `
      <text
        x="0"
        y="0"
        class="header"
        data-testid="header"
      >${this.title}</text>
    `;

    const prefixIcon = `
      <svg
        class="icon"
        x="0"
        y="-13"
        viewBox="0 0 16 16"
        version="1.1"
        width="16"
        height="16"
      >
        ${this.titlePrefixIcon}
      </svg>
    `;
    return `
      <g
        data-testid="card-title"
        transform="translate(${this.paddingX}, ${this.paddingY})"
      >
        ${flexLayout({
          items: [this.titlePrefixIcon ? prefixIcon : "", titleText],
          gap: 25,
        }).join("")}
      </g>
    `;
  }

  /**
   * @returns {string} The rendered card gradient.
   */
  renderGradient() {
    if (typeof this.colors.bgColor !== "object") {
      return "";
    }

    const gradients = this.colors.bgColor.slice(1);
    return typeof this.colors.bgColor === "object"
      ? `
        <defs>
          <linearGradient
            id="gradient"
            gradientTransform="rotate(${this.colors.bgColor[0]})"
            gradientUnits="userSpaceOnUse"
          >
            ${gradients.map((grad, index) => {
              let offset = (index * 100) / (gradients.length - 1);
              return `<stop offset="${offset}%" stop-color="#${grad}" />`;
            })}
          </linearGradient>
        </defs>
        `
      : "";
  }

  /**
   * @returns {string} Optional SVG defs used by card styles (clip paths, gradients, patterns).
   */
  renderStyleDefs() {
    if (!this.cardStyle) return "";

    const clipId = "card-clip";

    const isSpace =
      this.cardStyle.includes("space") || this.cardStyle.includes("cosmic");

    const defs = [];

    // Clip decorations to the rounded card shape.
    defs.push(`
      <clipPath id="${clipId}">
        <rect
          x="0.5"
          y="0.5"
          rx="${this.border_radius}"
          width="${this.width - 1}"
          height="${this.height - 1}"
        />
      </clipPath>
    `);

    if (isSpace) {
      // Common glow filter used by celestial objects.
      defs.push(`
        <filter id="sp-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 0.9 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      `);

      defs.push(`
        <radialGradient id="sp-sun" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stop-color="${this.colors.iconColor}" stop-opacity="0.95" />
          <stop offset="55%" stop-color="${this.colors.titleColor}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${this.colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <radialGradient id="sp-moon" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stop-color="${this.colors.textColor}" stop-opacity="0.85" />
          <stop offset="55%" stop-color="${this.colors.borderColor}" stop-opacity="0.35" />
          <stop offset="100%" stop-color="${this.colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <pattern id="sp-craters" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="11" r="2.2" fill="${this.colors.borderColor}" fill-opacity="0.22" />
          <circle cx="18" cy="8" r="1.6" fill="${this.colors.borderColor}" fill-opacity="0.16" />
          <circle cx="20" cy="20" r="2.5" fill="${this.colors.borderColor}" fill-opacity="0.18" />
          <circle cx="10" cy="23" r="1.4" fill="${this.colors.borderColor}" fill-opacity="0.14" />
        </pattern>

        <radialGradient id="sp-hole" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#000000" stop-opacity="0.88" />
          <stop offset="100%" stop-color="${this.colors.borderColor}" stop-opacity="0" />
        </radialGradient>

        <linearGradient id="sp-disk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${this.colors.titleColor}" stop-opacity="0" />
          <stop offset="45%" stop-color="${this.colors.titleColor}" stop-opacity="0.65" />
          <stop offset="55%" stop-color="${this.colors.iconColor}" stop-opacity="0.75" />
          <stop offset="100%" stop-color="${this.colors.iconColor}" stop-opacity="0" />
        </linearGradient>

        <radialGradient id="sp-star" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="${this.colors.textColor}" stop-opacity="0.95" />
          <stop offset="55%" stop-color="${this.colors.titleColor}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${this.colors.borderColor}" stop-opacity="0" />
        </radialGradient>
      `);
    }

    return `
      <defs>
        ${defs.join("\n")}
      </defs>
    `;
  }

  /**
   * @returns {string} Optional decorative layer added by card styles.
   */
  renderDecorations() {
    if (!this.cardStyle) return "";

    const clipId = "card-clip";
    const w = this.width;
    const h = this.height;

    const isSpace =
      this.cardStyle.includes("space") || this.cardStyle.includes("cosmic");

    const layers = [];

    if (isSpace) {
      const scene = this.resolveSpaceScene();

      const stars = [
        [0.08, 0.18, 1.2, 0],
        [0.14, 0.58, 0.9, 220],
        [0.22, 0.33, 1.6, 520],
        [0.31, 0.14, 0.8, 900],
        [0.38, 0.46, 1.1, 140],
        [0.47, 0.22, 0.7, 740],
        [0.58, 0.36, 1.4, 360],
        [0.66, 0.16, 1.0, 1100],
        [0.74, 0.44, 0.8, 620],
        [0.82, 0.28, 1.3, 260],
        [0.90, 0.56, 0.9, 980],
        [0.63, 0.72, 1.2, 420],
      ];

      const starNodes = stars
        .map(([xr, yr, r, d], i) => {
          const cx = (w * xr).toFixed(2);
          const cy = (h * yr).toFixed(2);
          const delay = `${d}ms`;
          const cls = i % 3 === 0 ? "sp-star sp-star--big" : "sp-star";
          return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" style="animation-delay:${delay}" />`;
        })
        .join("\n");

      const obj = (() => {
        const baseR = Math.max(54, Math.min(92, Math.round(w * 0.18)));

        if (scene === "sun") {
          const x = w + Math.round(baseR * 0.35);
          const y = Math.round(h * 0.28);
          return `
            <g class="sp-sun" transform="translate(${x}, ${y})" filter="url(#sp-glow)">
              <circle class="sp-sun__halo" r="${baseR + 18}" fill="url(#sp-sun)" opacity="0.42" />
              <circle class="sp-sun__core" r="${baseR}" fill="url(#sp-sun)" opacity="0.85" />
              <g class="sp-sun__flares">
                <path d="M0 ${-baseR - 12} L0 ${-baseR - 30}" />
                <path d="M${baseR + 12} 0 L${baseR + 32} 0" />
                <path d="M0 ${baseR + 12} L0 ${baseR + 30}" />
                <path d="M${-baseR - 12} 0 L${-baseR - 32} 0" />
                <path d="M${(baseR * 0.72).toFixed(1)} ${(-baseR * 0.72).toFixed(1)} L${(baseR * 0.92).toFixed(1)} ${(-baseR * 0.92).toFixed(1)}" />
                <path d="M${(baseR * 0.72).toFixed(1)} ${(baseR * 0.72).toFixed(1)} L${(baseR * 0.92).toFixed(1)} ${(baseR * 0.92).toFixed(1)}" />
              </g>
            </g>
          `;
        }

        if (scene === "moon") {
          const x = w + Math.round(baseR * 0.35);
          const y = Math.round(h * 0.30);
          return `
            <g class="sp-moon" transform="translate(${x}, ${y})">
              <circle class="sp-moon__body" r="${baseR}" fill="url(#sp-moon)" opacity="0.78" />
              <circle class="sp-moon__craters" r="${baseR}" fill="url(#sp-craters)" opacity="0.22" />
              <circle class="sp-moon__rim" r="${baseR}" fill="none" stroke="${this.colors.borderColor}" stroke-opacity="0.16" stroke-width="3" />
            </g>
          `;
        }

        if (scene === "blackhole") {
          const x = w + Math.round(baseR * 0.30);
          const y = h + Math.round(baseR * 0.10);
          return `
            <g class="sp-hole" transform="translate(${x}, ${y})">
              <g class="sp-hole__disk" filter="url(#sp-glow)">
                <ellipse rx="${Math.round(baseR * 1.75)}" ry="${Math.round(baseR * 0.42)}" fill="none" stroke="url(#sp-disk)" stroke-width="7" stroke-linecap="round" />
                <ellipse rx="${Math.round(baseR * 1.35)}" ry="${Math.round(baseR * 0.30)}" fill="none" stroke="url(#sp-disk)" stroke-width="4" stroke-linecap="round" opacity="0.7" />
              </g>
              <circle class="sp-hole__core" r="${Math.round(baseR * 0.92)}" fill="url(#sp-hole)" />
              <circle class="sp-hole__event" r="${Math.round(baseR * 0.62)}" fill="#000000" opacity="0.92" />
              <path class="sp-hole__lensing" d="M${-Math.round(baseR * 1.2)} ${-Math.round(baseR * 0.15)} C${-Math.round(baseR * 0.4)} ${-Math.round(baseR * 0.55)}, ${Math.round(baseR * 0.4)} ${-Math.round(baseR * 0.55)}, ${Math.round(baseR * 1.2)} ${-Math.round(baseR * 0.15)}" />
            </g>
          `;
        }

        // "star"
        const x = Math.round(w * 0.72);
        const y = Math.round(h * 0.22);
        const ray = Math.max(18, Math.round(baseR * 0.38));
        return `
          <g class="sp-starburst" transform="translate(${x}, ${y})" filter="url(#sp-glow)">
            <circle class="sp-starburst__halo" r="${Math.round(ray * 0.95)}" fill="url(#sp-star)" opacity="0.24" />
            <circle class="sp-starburst__core" r="${Math.max(7, Math.round(ray * 0.34))}" fill="url(#sp-star)" opacity="0.92" />
            <g class="sp-starburst__rays">
              <path d="M0 ${-ray} L0 ${ray}" />
              <path d="M${-ray} 0 L${ray} 0" />
              <path d="M${-Math.round(ray * 0.72)} ${-Math.round(ray * 0.72)} L${Math.round(ray * 0.72)} ${Math.round(ray * 0.72)}" />
              <path d="M${-Math.round(ray * 0.72)} ${Math.round(ray * 0.72)} L${Math.round(ray * 0.72)} ${-Math.round(ray * 0.72)}" />
            </g>
          </g>
        `;
      })();

      layers.push(`
        <g class="sp-space sp-space--${scene}" clip-path="url(#${clipId})">
          <g class="sp-stars">${starNodes}</g>
          ${obj}
        </g>
      `);
    }

    if (!layers.length) return "";

    return `
      <g data-testid="card-decorations">
        ${layers.join("\n")}
      </g>
    `;
  }

  /**
   * Retrieves css animations for a card.
   *
   * @returns {string} Animation css.
   */
  getAnimations = () => {
    const base = `
      /* Animations */
      @keyframes scaleInAnimation {
        from {
          transform: translate(-5px, 5px) scale(0);
        }
        to {
          transform: translate(-5px, 5px) scale(1);
        }
      }
      @keyframes fadeInAnimation {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;

    if (!this.cardStyle) return base;

    const isSpace =
      this.cardStyle.includes("space") || this.cardStyle.includes("cosmic");

    const extra = [];

    if (isSpace) {
      extra.push(`
        .sp-space { opacity: 0.9; }
        .sp-star { fill: ${this.colors.textColor}; opacity: 0.28; animation: spTwinkle 2.9s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .sp-star--big { opacity: 0.42; }

        .sp-sun { animation: spFloat 6.5s ease-in-out infinite; }
        .sp-sun__flares path { stroke: ${this.colors.iconColor}; stroke-opacity: 0.55; stroke-width: 3.2; stroke-linecap: round; animation: spFlares 3.6s ease-in-out infinite; }

        .sp-moon { animation: spFloat 7.5s ease-in-out infinite; }
        .sp-moon__body { filter: drop-shadow(0 0 10px ${this.colors.borderColor}); }
        .sp-moon__craters { animation: spCraters 4.2s ease-in-out infinite; }

        .sp-hole { opacity: 0.88; }
        .sp-hole__disk { animation: spSpin 6.2s linear infinite; transform-origin: center; }
        .sp-hole__lensing { fill: none; stroke: ${this.colors.titleColor}; stroke-opacity: 0.26; stroke-width: 3.2; stroke-linecap: round; animation: spPulse 3.8s ease-in-out infinite; }

        .sp-starburst { animation: spPulse 2.8s ease-in-out infinite; }
        .sp-starburst__rays path { stroke: ${this.colors.titleColor}; stroke-opacity: 0.42; stroke-width: 3.0; stroke-linecap: round; }

        @keyframes spTwinkle {
          0%, 100% { opacity: 0.18; transform: scale(0.95); }
          50% { opacity: 0.65; transform: scale(1.06); }
        }
        @keyframes spSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spFloat {
          0%, 100% { transform: translate(0px, 0px) rotate(-1deg); }
          50% { transform: translate(10px, -5px) rotate(2deg); }
        }
        @keyframes spPulse {
          0%, 100% { opacity: 0.22; transform: scale(0.98); }
          50% { opacity: 0.78; transform: scale(1.03); }
        }
        @keyframes spFlares {
          0%, 100% { stroke-opacity: 0.22; }
          50% { stroke-opacity: 0.78; }
        }
        @keyframes spCraters {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.32; }
        }
      `);
    }

    return base + extra.join("\n");
  };

  /**
   * @param {string} body The inner body of the card.
   * @returns {string} The rendered card.
   */
  render(body) {
    return `
      <svg
        width="${this.width}"
        height="${this.height}"
        viewBox="0 0 ${this.width} ${this.height}"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="descId"
      >
        <title id="titleId">${this.a11yTitle}</title>
        <desc id="descId">${this.a11yDesc}</desc>
        <style>
          .header {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            fill: ${this.colors.titleColor};
            animation: fadeInAnimation 0.8s ease-in-out forwards;
          }
          @supports(-moz-appearance: auto) {
            /* Selector detects Firefox */
            .header { font-size: 15.5px; }
          }
          ${this.css}

          ${process.env.NODE_ENV === "test" ? "" : this.getAnimations()}
          ${
            this.animations === false
              ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
              : ""
          }
        </style>

        ${this.renderGradient()}${this.renderStyleDefs()}

        <rect
          data-testid="card-bg"
          x="0.5"
          y="0.5"
          rx="${this.border_radius}"
          height="99%"
          stroke="${this.colors.borderColor}"
          width="${this.width - 1}"
          fill="${
            typeof this.colors.bgColor === "object"
              ? "url(#gradient)"
              : this.colors.bgColor
          }"
          stroke-opacity="${this.hideBorder ? 0 : 1}"
        />

        ${this.renderDecorations()}${this.hideTitle ? "" : this.renderTitle()}

        <g
          data-testid="main-card-body"
          transform="translate(0, ${
            this.hideTitle ? this.paddingX : this.paddingY + 20
          })"
        >
          ${body}
        </g>
      </svg>
    `;
  }
}

export { Card };
export default Card;
