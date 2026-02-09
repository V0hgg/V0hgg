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
    // Examples: "space", "arcade", "space-arcade"
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
    this.cardStyle = normalized;
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
    const isArcade =
      this.cardStyle.includes("arcade") || this.cardStyle.includes("game");

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
      defs.push(`
        <radialGradient id="sc-planet" cx="30%" cy="30%" r="75%">
          <stop offset="0%" stop-color="${this.colors.titleColor}" stop-opacity="0.9" />
          <stop offset="55%" stop-color="${this.colors.iconColor}" stop-opacity="0.45" />
          <stop offset="100%" stop-color="${this.colors.borderColor}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sc-comet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${this.colors.iconColor}" stop-opacity="0" />
          <stop offset="55%" stop-color="${this.colors.iconColor}" stop-opacity="0.6" />
          <stop offset="100%" stop-color="${this.colors.titleColor}" stop-opacity="0.9" />
        </linearGradient>
      `);
    }

    if (isArcade) {
      defs.push(`
        <pattern id="ac-grid" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0H0V18" fill="none" stroke="${this.colors.borderColor}" stroke-opacity="0.18" stroke-width="1" />
        </pattern>
        <linearGradient id="ac-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${this.colors.iconColor}" stop-opacity="0" />
          <stop offset="40%" stop-color="${this.colors.iconColor}" stop-opacity="0.12" />
          <stop offset="60%" stop-color="${this.colors.titleColor}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="${this.colors.titleColor}" stop-opacity="0" />
        </linearGradient>
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
    const isArcade =
      this.cardStyle.includes("arcade") || this.cardStyle.includes("game");

    const layers = [];

    if (isSpace) {
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
          const cls = i % 3 === 0 ? "sc-star sc-star--big" : "sc-star";
          return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" style="animation-delay:${delay}" />`;
        })
        .join("\n");

      const planetX = w + 35;
      const planetY = h + 20;

      layers.push(`
        <g class="sc-space" clip-path="url(#${clipId})">
          <g class="sc-stars">${starNodes}</g>

          <g class="sc-orbit" transform="translate(${(w * 0.74).toFixed(2)}, ${(h * 0.32).toFixed(2)})">
            <circle class="sc-moon" cx="0" cy="0" r="4" />
            <circle class="sc-moon sc-moon--ghost" cx="0" cy="0" r="9" />
          </g>

          <g class="sc-planet" transform="translate(${planetX}, ${planetY})">
            <circle r="${Math.max(55, Math.min(90, Math.round(w * 0.18)))}" fill="url(#sc-planet)" />
            <ellipse class="sc-ring" rx="${Math.max(72, Math.min(110, Math.round(w * 0.23)))}" ry="${Math.max(14, Math.min(22, Math.round(w * 0.04)))}" />
          </g>

          <g class="sc-ship" transform="translate(${(w * 0.10).toFixed(2)}, ${(h * 0.76).toFixed(2)})">
            <path class="sc-ship-body" d="M0 0 L18 7 L0 14 L5 7 Z" />
            <path class="sc-ship-glow" d="M-10 7 L4 7" />
          </g>

          <g class="sc-comet">
            <rect x="${(w * 0.55).toFixed(2)}" y="${(h * 0.08).toFixed(2)}" width="${Math.max(70, Math.round(w * 0.22))}" height="2.2" rx="2" fill="url(#sc-comet)" />
          </g>
        </g>
      `);
    }

    if (isArcade) {
      layers.push(`
        <g class="ac-arcade" clip-path="url(#${clipId})">
          <rect class="ac-grid" x="0" y="0" width="${w}" height="${h}" fill="url(#ac-grid)" />
          <rect class="ac-scan" x="0" y="-${h}" width="${w}" height="${h}" fill="url(#ac-scan)" />

          <g class="ac-sprite" transform="translate(${(w * 0.78).toFixed(2)}, ${(h * 0.18).toFixed(2)})">
            <rect class="ac-px" x="0" y="0" width="4" height="4" rx="1" />
            <rect class="ac-px" x="6" y="0" width="4" height="4" rx="1" />
            <rect class="ac-px" x="12" y="0" width="4" height="4" rx="1" />
            <rect class="ac-px" x="6" y="6" width="4" height="4" rx="1" />
            <rect class="ac-px" x="0" y="12" width="4" height="4" rx="1" />
            <rect class="ac-px" x="12" y="12" width="4" height="4" rx="1" />
          </g>
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
    const isArcade =
      this.cardStyle.includes("arcade") || this.cardStyle.includes("game");

    const extra = [];

    if (isSpace) {
      extra.push(`
        .sc-space { opacity: 0.9; }
        .sc-star { fill: ${this.colors.textColor}; opacity: 0.30; animation: scTwinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .sc-star--big { opacity: 0.42; }
        .sc-orbit { animation: scOrbit 6s linear infinite; transform-origin: center; }
        .sc-moon { fill: ${this.colors.borderColor}; opacity: 0.35; }
        .sc-moon--ghost { fill: none; stroke: ${this.colors.borderColor}; stroke-opacity: 0.15; stroke-width: 1; }
        .sc-planet { opacity: 0.55; }
        .sc-ring { fill: none; stroke: ${this.colors.borderColor}; stroke-opacity: 0.20; stroke-width: 3; transform: rotate(-16deg); }
        .sc-ship { animation: scDrift 4.5s ease-in-out infinite; }
        .sc-ship-body { fill: ${this.colors.iconColor}; opacity: 0.85; }
        .sc-ship-glow { stroke: ${this.colors.titleColor}; stroke-opacity: 0.6; stroke-width: 2.5; stroke-linecap: round; filter: drop-shadow(0 0 6px ${this.colors.titleColor}); }
        .sc-comet { opacity: 0.7; animation: scComet 5.5s ease-in-out infinite; }

        @keyframes scTwinkle {
          0%, 100% { opacity: 0.18; transform: scale(0.95); }
          50% { opacity: 0.65; transform: scale(1.06); }
        }
        @keyframes scOrbit {
          from { transform: rotate(0deg) translateX(14px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(14px) rotate(-360deg); }
        }
        @keyframes scDrift {
          0%, 100% { transform: translate(0px, 0px) rotate(-1deg); }
          50% { transform: translate(10px, -5px) rotate(2deg); }
        }
        @keyframes scComet {
          0%, 100% { transform: translate(0px, 0px); opacity: 0.3; }
          35% { transform: translate(18px, 10px); opacity: 0.75; }
          65% { transform: translate(-8px, -6px); opacity: 0.55; }
        }
      `);
    }

    if (isArcade) {
      extra.push(`
        .ac-arcade { opacity: 0.9; }
        .ac-grid { opacity: 0.35; }
        .ac-scan { opacity: 0.65; animation: acScan 3.8s linear infinite; }
        .ac-sprite { animation: acBounce 1.6s ease-in-out infinite; }
        .ac-px { fill: ${this.colors.iconColor}; opacity: 0.72; filter: drop-shadow(0 0 6px ${this.colors.iconColor}); }

        @keyframes acScan {
          from { transform: translateY(0); }
          to { transform: translateY(${this.height * 2}px); }
        }
        @keyframes acBounce {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(-8px, 7px) rotate(3deg); }
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
