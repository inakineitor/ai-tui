import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { RGBA } from "@opentui/core";

import { useAgents, useSubagents } from "#context/config.tsx";
import type { Agent } from "#types.ts";

type AgentContextValue = {
  selectedAgentIndex: number;
  selectedAgent: Agent;
  cycleAgent: () => void;
  setAgent: (id: string) => void;
  getAgentColor: (id: string) => RGBA | null;
};

const AgentContext = createContext<AgentContextValue | null>(null);

type AgentProviderProps = {
  children: ReactNode;
};

export function AgentProvider({ children }: AgentProviderProps) {
  const agents = useAgents();
  const subagents = useSubagents();
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);

  const cycleAgent = useCallback(() => {
    setSelectedAgentIndex((prev) => (prev + 1) % agents.length);
  }, [agents.length]);

  const setAgent = useCallback(
    (id: string) => {
      const index = agents.findIndex((a) => a.id === id);
      if (index === -1) {
        console.warn(`Agent not found: ${id}`);
        return;
      }
      setSelectedAgentIndex(index);
    },
    [agents]
  );

  const getAgentColor = useCallback(
    (id: string): RGBA | null => {
      const agent = agents.find((a) => a.id === id);
      if (agent?.color) {
        return agent.color; // Already RGBA (normalized in Agent constructor)
      }

      const subagent = subagents.find((s) => s.id === id);
      if (!subagent?.color) {
        return null;
      }
      // Normalize subagent color on access (subagents don't have constructors)
      return subagent.color instanceof RGBA
        ? subagent.color
        : RGBA.fromHex(subagent.color);
    },
    [agents, subagents]
  );

  const selectedAgent = agents[selectedAgentIndex] as Agent;

  const value = useMemo(
    () => ({
      selectedAgentIndex,
      selectedAgent,
      cycleAgent,
      setAgent,
      getAgentColor,
    }),
    [selectedAgentIndex, selectedAgent, cycleAgent, setAgent, getAgentColor]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return ctx;
}
