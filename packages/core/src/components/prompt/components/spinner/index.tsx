import "opentui-spinner/react";

import type { ColorInput } from "@opentui/core";

import { createColors, createFrames } from "./lib/spinner-utils.ts";

type SpinnerProps = {
  color: ColorInput;
};

export function Spinner({ color }: SpinnerProps) {
  const frames = createFrames({
    color,
    style: "blocks",
    inactiveFactor: 0.6,
    minAlpha: 0.3,
  });
  const colors = createColors({
    color,
    style: "blocks",
    inactiveFactor: 0.6,
    minAlpha: 0.3,
  });

  return <spinner color={colors} frames={frames} interval={40} />;
}

type StreamingIndicatorProps = {
  isLoading: boolean;
  agentColor: ColorInput;
};

export function StreamingIndicator({
  isLoading,
  agentColor,
}: StreamingIndicatorProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <box marginLeft={1}>
      <Spinner color={agentColor} />
    </box>
  );
}
