import { type ReactNode, useMemo } from "react";

import figlet from "figlet";

import { useAppName } from "#context/config.js";
import { useTheme } from "#context/theme/index.js";
import type { TitleSection } from "#types.js";

import { DEFAULT_GRADIENT_COLORS, getGradientColor } from "./lib/gradient.js";

/** Default separator between sections (4 spaces) */
const DEFAULT_SEPARATOR = "    ";

/**
 * Render a line of text with gradient coloring.
 */
function GradientLine({ text, colors }: { text: string; colors: string[] }) {
  const chars = text.split("");
  return (
    <text>
      {chars.map((char, i) => {
        const position = chars.length > 1 ? i / (chars.length - 1) : 0;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static content, index is stable
          <span fg={getGradientColor(position, colors)} key={i}>
            {char}
          </span>
        );
      })}
    </text>
  );
}

/**
 * Generate figlet text for a string.
 */
const generateFiglet = (text: string): string[] =>
  figlet
    .textSync(text.toUpperCase(), {
      font: "ANSI Shadow",
      horizontalLayout: "default",
    })
    .split("\n");

/**
 * Render a single section line based on its style.
 */
function SectionLine({
  text,
  section,
  theme,
}: {
  text: string;
  section: TitleSection;
  theme: { text: string; textMuted: string };
}) {
  switch (section.style) {
    case "gradient": {
      const colors = section.gradient ?? DEFAULT_GRADIENT_COLORS;
      return <GradientLine colors={colors} text={text} />;
    }
    case "muted":
      return <text fg={theme.textMuted}>{text}</text>;
    default:
      // "plain" or undefined
      return <text fg={theme.text}>{text}</text>;
  }
}

export function Logo() {
  const { theme } = useTheme();
  const appName = useAppName();

  const { figletSections, lineCount } = useMemo(() => {
    const figlets = appName.sections.map((section) => ({
      section,
      lines: generateFiglet(section.text),
    }));
    const count = figlets[0]?.lines.length ?? 0;
    return {
      figletSections: figlets,
      lineCount: count,
    };
  }, [appName]);

  const separator = appName.separator ?? DEFAULT_SEPARATOR;

  return (
    <box flexDirection="column">
      {Array.from({ length: lineCount }).map((_, lineIndex) => {
        const elements: ReactNode[] = [];

        for (
          let sectionIndex = 0;
          sectionIndex < figletSections.length;
          sectionIndex++
        ) {
          const figletSection = figletSections[sectionIndex];
          if (!figletSection) {
            continue;
          }
          const { section, lines } = figletSection;
          const lineText = lines[lineIndex] ?? "";

          // Add separator before all sections except the first
          if (sectionIndex > 0) {
            elements.push(<text key={`sep-${sectionIndex}`}>{separator}</text>);
          }

          elements.push(
            <SectionLine
              key={`section-${sectionIndex}`}
              section={section}
              text={lineText}
              theme={theme}
            />
          );
        }

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static content, index is stable
          <box flexDirection="row" key={lineIndex}>
            {elements}
          </box>
        );
      })}
    </box>
  );
}
