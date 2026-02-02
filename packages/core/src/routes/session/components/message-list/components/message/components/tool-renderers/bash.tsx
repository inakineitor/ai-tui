import { useTheme } from "#context/theme/index.tsx";

import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

export function BashTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { syntax } = useTheme();
  const { input, output, error, metadata } = tool.state;

  const command = input?.command as string | undefined;
  const description = input?.description as string | undefined;
  const workdir = metadata?.workdir as string | undefined;

  if (isComplete && !output && !error) {
    return (
      <InlineTool
        complete
        hasError={!!error}
        icon="$"
        pending="Running command..."
      >
        {description ?? command ?? "bash"}
      </InlineTool>
    );
  }

  const title = description ?? command ?? "bash";

  return (
    <BlockTool
      collapsible={!!output && output.length > 200}
      hasError={!!error}
      title={title}
    >
      {command && (
        <box paddingLeft={1}>
          <text fg={theme.textMuted}>$ {command}</text>
        </box>
      )}

      {workdir && (
        <text fg={theme.textMuted} paddingLeft={1}>
          in {workdir}
        </text>
      )}

      {output && (
        <box maxHeight={15} paddingLeft={1}>
          <code
            content={output}
            fg={theme.text}
            filetype="bash"
            syntaxStyle={syntax}
          />
        </box>
      )}

      {error && (
        <text fg={theme.error} paddingLeft={1}>
          {error}
        </text>
      )}
    </BlockTool>
  );
}
