import { useCallback, useEffect, useRef, useState } from "react";

import type { Agent, AgentMetadata } from "#types.ts";

export type FileUIPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
};

export type QueuedMessage = {
  id: string;
  text: string;
  files?: FileUIPart[];
  agent: AgentMetadata;
  queuedAt: number;
};

type UseMessageQueueOptions = {
  status: "ready" | "submitted" | "streaming" | "error";
  sendMessage: (options: {
    text: string;
    files?: FileUIPart[];
    metadata: { agent: AgentMetadata };
  }) => void;
  selectedAgent: Agent;
  maxQueueSize?: number;
};

type UseMessageQueueReturn = {
  /** The current message queue */
  queue: QueuedMessage[];
  /** Queue a message (or send immediately if ready) */
  submitMessage: (text: string, files?: FileUIPart[]) => void;
  /** Clear all queued messages */
  clearQueue: () => void;
  /** Remove a specific message from the queue */
  removeFromQueue: (id: string) => void;
  /** Whether there are queued messages */
  hasQueuedMessages: boolean;
};

export function useMessageQueue({
  status,
  sendMessage,
  selectedAgent,
  maxQueueSize = 10,
}: UseMessageQueueOptions): UseMessageQueueReturn {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);

  // Use ref to track if we're currently processing to prevent race conditions
  const isProcessingRef = useRef(false);

  // Track previous status to detect transitions
  const prevStatusRef = useRef(status);

  const isReady = status === "ready";

  // Process queue when status becomes "ready"
  useEffect(() => {
    const wasNotReady =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    const isNowReady = status === "ready";

    // Update previous status
    prevStatusRef.current = status;

    // Only process if we transitioned TO ready and have queued messages
    if (
      wasNotReady &&
      isNowReady &&
      queue.length > 0 &&
      !isProcessingRef.current
    ) {
      isProcessingRef.current = true;

      // Get the first message from queue
      const [nextMessage, ...remainingQueue] = queue;

      if (nextMessage) {
        // Remove from queue first
        setQueue(remainingQueue);

        // Send the message with its captured agent
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          sendMessage({
            text: nextMessage.text,
            files: nextMessage.files,
            metadata: { agent: nextMessage.agent },
          });
          isProcessingRef.current = false;
        }, 0);
      } else {
        isProcessingRef.current = false;
      }
    }
  }, [status, queue, sendMessage]);

  const submitMessage = useCallback(
    (text: string, files?: FileUIPart[]) => {
      const trimmedText = text.trim();
      if (!trimmedText && (!files || files.length === 0)) {
        return;
      }

      if (isReady && !isProcessingRef.current) {
        sendMessage({
          text: trimmedText,
          files,
          metadata: { agent: selectedAgent.metadata() },
        });
        return;
      }

      const queuedMessage: QueuedMessage = {
        id: crypto.randomUUID(),
        text: trimmedText,
        files,
        agent: selectedAgent.metadata(),
        queuedAt: Date.now(),
      };

      setQueue((prev) => {
        // Enforce max queue size
        if (prev.length >= maxQueueSize) {
          // Drop the oldest message
          return [...prev.slice(1), queuedMessage];
        }
        return [...prev, queuedMessage];
      });
    },
    [isReady, sendMessage, selectedAgent, maxQueueSize]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return {
    queue,
    submitMessage,
    clearQueue,
    removeFromQueue,
    hasQueuedMessages: queue.length > 0,
  };
}
