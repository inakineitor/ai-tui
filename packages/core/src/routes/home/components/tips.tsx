import { useMemo } from "react";

import { useTips } from "#context/config.js";
import { useTheme } from "#context/theme/index.js";

type TipPart = { text: string; highlight: boolean };

const HIGHLIGHT_REGEX = /\{highlight\}(.*?)\{\/highlight\}/g;

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = [];
  const matches = Array.from(tip.matchAll(HIGHLIGHT_REGEX));

  let index = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    if (start > index) {
      parts.push({ text: tip.slice(index, start), highlight: false });
    }
    parts.push({ text: match[1] ?? "", highlight: true });
    index = start + match[0].length;
  }

  if (index < tip.length) {
    parts.push({ text: tip.slice(index), highlight: false });
  }

  return parts;
}

export function Tips() {
  const { theme } = useTheme();
  const tips = useTips();

  const parts = useMemo(() => {
    if (tips.length === 0) {
      return [];
    }
    const index = Math.floor(Math.random() * tips.length);
    const randomTip = tips[index] as string;
    return parse(randomTip);
  }, [tips]);

  if (tips.length === 0) {
    return null;
  }

  return (
    <box flexDirection="row" maxWidth="100%">
      <text fg={theme.warning} flexShrink={0}>
        {"● Tip "}
      </text>
      <text flexShrink={1}>
        {parts.map((part) => (
          <span
            fg={part.highlight ? theme.text : theme.textMuted}
            key={part.text}
          >
            {part.text}
          </span>
        ))}
      </text>
    </box>
  );
}
