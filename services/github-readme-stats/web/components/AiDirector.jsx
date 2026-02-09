import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";

function joinTextParts(parts) {
  return (parts || [])
    .map((p) => (p?.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("");
}

function extractJson(text) {
  const s = String(text || "");
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i === -1 || j === -1 || j <= i) return null;
  const chunk = s.slice(i, j + 1);
  try {
    return JSON.parse(chunk);
  } catch {
    return null;
  }
}

export default function AiDirector({ enabled, onApplyPreset }) {
  const { messages, sendMessage, isLoading, error } = useChat({
    api: "/api/lab-chat",
  });

  const [input, setInput] = useState("");

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const lastText = useMemo(
    () => (lastAssistant ? joinTextParts(lastAssistant.parts) : ""),
    [lastAssistant],
  );

  const preset = useMemo(() => extractJson(lastText), [lastText]);

  if (!enabled) {
    return (
      <section className="aiPanel">
        <div className="aiPanel__head">
          <div className="kicker">Ship AI</div>
          <div className="aiPanel__title">Offline</div>
        </div>
        <p className="muted">
          Add <code>OPENAI_API_KEY</code> in Vercel (or local env) to enable the preset generator.
        </p>
      </section>
    );
  }

  return (
    <section className="aiPanel" aria-label="AI preset generator">
      <div className="aiPanel__head">
        <div>
          <div className="kicker">Ship AI</div>
          <div className="aiPanel__title">Preset Generator</div>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--tiny"
          onClick={() => {
            if (preset) onApplyPreset?.(preset);
          }}
          disabled={!preset}
          title={!preset ? "Ask the AI for a JSON preset first" : "Apply the last JSON preset"}
        >
          Apply
        </button>
      </div>

      <div className="aiPanel__log" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="muted">
            Try: <span className="mono">“Make it cinematic, blackhole-heavy, neon-green numbers, minimal borders.”</span>
          </div>
        ) : null}
        {messages.map((m) => {
          const text = joinTextParts(m.parts);
          if (!text) return null;
          return (
            <div key={m.id} className={`aiMsg aiMsg--${m.role}`}>
              <div className="aiMsg__role">{m.role}</div>
              <div className="aiMsg__body">{text}</div>
            </div>
          );
        })}
      </div>

      {error ? <div className="aiPanel__err">AI error: {error.message}</div> : null}

      <form
        className="aiPanel__form"
        onSubmit={(e) => {
          e.preventDefault();
          const content = input.trim();
          if (!content) return;
          sendMessage({ content });
          setInput("");
        }}
      >
        <input
          className="field__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a preset…"
          disabled={isLoading}
          aria-label="AI prompt"
        />
        <button className="btn" type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </section>
  );
}

