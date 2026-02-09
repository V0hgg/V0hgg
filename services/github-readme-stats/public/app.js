const qs = (sel) => document.querySelector(sel);

const els = {
  username: qs("#username"),
  cardStyle: qs("#cardStyle"),
  cacheSeconds: qs("#cacheSeconds"),
  showIcons: qs("#showIcons"),
  includeAllCommits: qs("#includeAllCommits"),
  hideBorder: qs("#hideBorder"),
  compactLangs: qs("#compactLangs"),
  theme: qs("#theme"),
  statsImg: qs("#statsImg"),
  langsImg: qs("#langsImg"),
  mdOut: qs("#mdOut"),
  copyMarkdown: qs("#copyMarkdown"),
  copyCode: qs("#copyCode"),
  openStats: qs("#openStats"),
  randomize: qs("#randomize"),
};

const themeChoices = [
  "space_arcade_gradient",
  "space_arcade",
  "neon_circuit_gradient",
  "neon_circuit",
  "tokyonight",
  "dracula",
  "dark",
];

function safeInt(value, fallback) {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildUrls() {
  const username = (els.username.value || "V0hgg").trim();
  const theme = els.theme.value || "space_arcade_gradient";
  const card_style = els.cardStyle.value;
  const cache_seconds = safeInt(els.cacheSeconds.value, 21600);
  const hide_border = els.hideBorder.checked ? "true" : "false";

  const stats = new URLSearchParams();
  stats.set("username", username);
  stats.set("show_icons", els.showIcons.checked ? "true" : "false");
  stats.set("hide_border", hide_border);
  stats.set("theme", theme);
  if (card_style) stats.set("card_style", card_style);
  stats.set("include_all_commits", els.includeAllCommits.checked ? "true" : "false");
  stats.set("cache_seconds", String(cache_seconds));

  const langs = new URLSearchParams();
  langs.set("username", username);
  langs.set("layout", els.compactLangs.checked ? "compact" : "normal");
  langs.set("hide_border", hide_border);
  // Top-langs looks nicer without the gradient background by default.
  langs.set("theme", theme === "space_arcade_gradient" ? "space_arcade" : theme);
  if (card_style) langs.set("card_style", card_style);
  langs.set("cache_seconds", String(cache_seconds));

  const statsUrl = `/api?${stats.toString()}`;
  const langsUrl = `/api/top-langs?${langs.toString()}`;
  return { username, statsUrl, langsUrl };
}

function update() {
  const { statsUrl, langsUrl } = buildUrls();

  // Bust browser cache on rapid edits while keeping server cache intact.
  const bust = `b=${Date.now().toString(36)}`;
  els.statsImg.src = `${statsUrl}&${bust}`;
  els.langsImg.src = `${langsUrl}&${bust}`;

  const origin = window.location.origin;
  const md = [
    `![GitHub Stats](${origin}${statsUrl})`,
    ``,
    `![Top Languages](${origin}${langsUrl})`,
  ].join("\n");
  els.mdOut.textContent = md;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

els.copyMarkdown.addEventListener("click", async () => {
  await copyText(els.mdOut.textContent);
  els.copyMarkdown.textContent = "Copied";
  setTimeout(() => (els.copyMarkdown.textContent = "Copy README Markdown"), 900);
});

els.copyCode.addEventListener("click", async () => {
  await copyText(els.mdOut.textContent);
  els.copyCode.textContent = "Copied";
  setTimeout(() => (els.copyCode.textContent = "Copy"), 900);
});

els.openStats.addEventListener("click", () => {
  const { statsUrl, langsUrl } = buildUrls();
  window.open(statsUrl, "_blank", "noopener,noreferrer");
  window.open(langsUrl, "_blank", "noopener,noreferrer");
});

els.randomize.addEventListener("click", () => {
  const pick = themeChoices[Math.floor(Math.random() * themeChoices.length)];
  els.theme.value = pick;
  update();
});

// Live updates.
qs("#controls").addEventListener("input", () => update());

// Initial state
els.username.value = "V0hgg";
els.theme.value = "space_arcade_gradient";
els.cardStyle.value = "space-arcade";
update();

// ---- Starfield ----

const canvas = qs("#starfield");
const ctx = canvas.getContext("2d");
let stars = [];
let last = performance.now();
let mouse = { x: 0, y: 0, active: false };

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.floor((window.innerWidth * window.innerHeight) / 14000);
  stars = Array.from({ length: Math.max(90, Math.min(240, count)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    z: 0.2 + Math.random() * 0.8,
    r: 0.6 + Math.random() * 1.8,
    tw: Math.random() * Math.PI * 2,
  }));
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Subtle drift toward the mouse.
  const mx = mouse.active ? (mouse.x - window.innerWidth / 2) * 0.0006 : 0;
  const my = mouse.active ? (mouse.y - window.innerHeight / 2) * 0.0006 : 0;

  for (const s of stars) {
    s.tw += dt * (1.2 + s.z * 2.0);
    s.x += (10 * s.z + 6) * dt + mx * 120;
    s.y += (2.2 * s.z + 0.8) * dt + my * 120;

    if (s.x > window.innerWidth + 10) s.x = -10;
    if (s.y > window.innerHeight + 10) s.y = -10;

    const a = 0.12 + (Math.sin(s.tw) * 0.5 + 0.5) * 0.38;
    ctx.fillStyle = `rgba(231, 251, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A single playful "comet" streak.
  const t = now / 1000;
  const cx = (window.innerWidth * 0.1 + (t * 70) % (window.innerWidth + 300)) - 150;
  const cy = window.innerHeight * 0.2 + Math.sin(t * 0.7) * 26;
  const grad = ctx.createLinearGradient(cx, cy, cx + 180, cy + 6);
  grad.addColorStop(0, "rgba(125,249,255,0)");
  grad.addColorStop(0.55, "rgba(125,249,255,0.16)");
  grad.addColorStop(1, "rgba(255,79,216,0.22)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 180, cy + 6);
  ctx.stroke();

  requestAnimationFrame(tick);
}

window.addEventListener("resize", resize, { passive: true });
window.addEventListener(
  "pointermove",
  (e) => {
    mouse = { x: e.clientX, y: e.clientY, active: true };
  },
  { passive: true },
);
window.addEventListener(
  "pointerleave",
  () => {
    mouse.active = false;
  },
  { passive: true },
);

resize();
requestAnimationFrame(tick);
