import statsCard from "./api/index.js";
import repoCard from "./api/pin.js";
import langCard from "./api/top-langs.js";
import wakatimeCard from "./api/wakatime.js";
import gistCard from "./api/gist.js";
import telemetryCard from "./api/telemetry.js";
import express from "express";
import { loadDotenv } from "./src/common/load-dotenv.js";

loadDotenv();

const app = express();
const router = express.Router();

// Local dev UX: serve the Space Arcade playground at `/`.
app.use(express.static("public"));

router.get("/", statsCard);
router.get("/pin", repoCard);
router.get("/top-langs", langCard);
router.get("/wakatime", wakatimeCard);
router.get("/gist", gistCard);
router.get("/telemetry", telemetryCard);

app.use("/api", router);

const port = process.env.PORT || process.env.port || 9000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
