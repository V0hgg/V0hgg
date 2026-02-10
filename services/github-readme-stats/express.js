import statsCard from "./api/index.js";
import repoCard from "./api/pin.js";
import langCard from "./api/top-langs.js";
import wakatimeCard from "./api/wakatime.js";
import gistCard from "./api/gist.js";
import telemetryCard from "./api/telemetry.js";
import express from "express";
import { loadDotenv } from "./src/common/load-dotenv.js";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

loadDotenv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = express();
  const router = express.Router();

  router.get("/", statsCard);
  router.get("/pin", repoCard);
  router.get("/top-langs", langCard);
  router.get("/wakatime", wakatimeCard);
  router.get("/gist", gistCard);
  router.get("/telemetry", telemetryCard);

  app.use("/api", router);

  const server = createServer(app);
  const port = Number(process.env.PORT || process.env.port || 3000);

  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve(__dirname, "dist");
    app.use(express.static(dist));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    // Vite dev server in middleware mode (single-process dev).
    const hmrPort = Number(process.env.VITE_HMR_PORT || port + 1);
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true, hmr: { port: hmrPort } },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Enable Vite HMR WS upgrades in dev.
    server.on("upgrade", (req, socket, head) => {
      // @ts-ignore
      vite.ws.handleUpgrade(req, socket, head);
    });

    app.use(async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let html = await fs.readFile(path.resolve(__dirname, "index.html"), "utf-8");
        html = await vite.transformIndexHtml(url, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        // @ts-ignore
        vite.ssrFixStacktrace?.(err);
        next(err);
      }
    });
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
