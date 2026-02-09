import { useCallback, useMemo, useState } from "react";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

export default function CopyButton({ text, label = "Copy", copiedLabel = "Copied" }) {
  const [copied, setCopied] = useState(false);
  const display = useMemo(() => (copied ? copiedLabel : label), [copied, copiedLabel, label]);

  const onClick = useCallback(async () => {
    await copyText(text || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 900);
  }, [text]);

  return (
    <button className={`btn btn--ghost btn--tiny ${copied ? "is-copied" : ""}`} type="button" onClick={onClick}>
      {display}
    </button>
  );
}

