import { useMemo } from "react";

import { BlockTool } from "../../block-tool.js";
import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

type QuestionInput = {
  question: string;
  options?: string[];
};

export function QuestionTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;
  const questions = input?.questions as QuestionInput[] | undefined;
  const answers = metadata?.answers as string[][] | undefined;

  const count = useMemo(() => questions?.length ?? 0, [questions]);

  const formatAnswer = (answer?: string[]): string => {
    if (!answer?.length) {
      return "(no answer)";
    }
    return answer.join(", ");
  };

  if (answers) {
    return (
      <BlockTool hasError={!!error} title="# Questions">
        <box gap={1}>
          {(questions ?? []).map((q, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: questions don't have unique IDs
            <box flexDirection="column" key={`question-${i}`}>
              <text fg={theme.textMuted}>{q.question}</text>
              <text fg={theme.text}>{formatAnswer(answers[i])}</text>
            </box>
          ))}
        </box>
      </BlockTool>
    );
  }

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u2192"}
      pending="Asking questions..."
    >
      Asked {count} question{count !== 1 ? "s" : ""}
    </InlineTool>
  );
}
