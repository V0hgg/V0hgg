// @ts-check

import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

const SYSTEM = `
You are a UI/UX art director for a futuristic space telemetry dashboard.

Return ONLY a single JSON object with the keys:
- theme (string)
- sceneMode ("auto" | "blackhole" | "sun" | "star" | "moon")
- cacheSeconds (number)
- langsCount (number)
- includeAllCommits (boolean)
- hideBorder (boolean)
- username (string, optional)

No Markdown. No code fences. No explanation.
`.trim();

/**
 * @param {import('http').IncomingMessage & { body?: any }} req
 * @returns {Promise<any>}
 */
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

// @ts-ignore
export default async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "AI disabled (missing OPENAI_API_KEY)" }));
    return;
  }

  const body = await readJson(req);
  const uiMessages = Array.isArray(body?.messages) ? body.messages : [];

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL || "gpt-4.1-mini"),
    system: SYSTEM,
    messages: convertToModelMessages(uiMessages),
  });

  result.pipeUIMessageStreamToResponse(res);
};

