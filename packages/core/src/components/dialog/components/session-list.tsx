import { useCallback, useMemo, useState } from "react";

import { useKeybind } from "#context/keybind.tsx";
import { type Session, useSession } from "#context/session.tsx";

import { useDialog } from "../context.tsx";
import { DialogSelect, type DialogSelectOption } from "./select.tsx";

type DialogSessionListProps = {
  onSelect?: (session: Session) => void;
  onNew?: () => void;
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
}

type SessionOptionValue =
  | { type: "new" }
  | { type: "session"; session: Session };

export function DialogSessionList({ onSelect, onNew }: DialogSessionListProps) {
  const { clear } = useDialog();
  const keybind = useKeybind();
  const { sessions, loadSession, createSession, deleteSession } = useSession();
  const [_renameTarget, setRenameTarget] = useState<Session | null>(null);

  const options = useMemo<DialogSelectOption<SessionOptionValue>[]>(() => {
    const newSessionOption: DialogSelectOption<SessionOptionValue> = {
      value: { type: "new" },
      title: "+ New Session",
      category: "",
    };

    const sessionOptions: DialogSelectOption<SessionOptionValue>[] =
      sessions.map((session) => ({
        value: { type: "session", session },
        title: session.title,
        description: `${session.messageCount} msgs`,
        footer: formatRelativeTime(session.updatedAt),
        category: "Sessions",
      }));

    return [newSessionOption, ...sessionOptions];
  }, [sessions]);

  const handleSelect = useCallback(
    async (option: DialogSelectOption<SessionOptionValue>) => {
      if (option.value.type === "new") {
        clear();
        await createSession("default");
        onNew?.();
      } else {
        clear();
        await loadSession(option.value.session.id);
        onSelect?.(option.value.session);
      }
    },
    [clear, createSession, loadSession, onNew, onSelect]
  );

  const handleDelete = useCallback(
    async (option: DialogSelectOption<SessionOptionValue>) => {
      if (option.value.type === "session") {
        await deleteSession(option.value.session.id);
      }
    },
    [deleteSession]
  );

  const handleRename = useCallback(
    (option: DialogSelectOption<SessionOptionValue>) => {
      if (option.value.type === "session") {
        setRenameTarget(option.value.session);
        // TODO: Open rename dialog - will be implemented when rename dialog exists
      }
    },
    []
  );

  return (
    <DialogSelect
      keybinds={[
        {
          keybind: keybind.all.session_delete?.[0],
          title: "delete",
          disabled: false,
          onTrigger: handleDelete,
        },
        {
          keybind: keybind.all.session_rename?.[0],
          title: "rename",
          disabled: false,
          onTrigger: handleRename,
        },
      ]}
      onSelect={handleSelect}
      options={options}
      placeholder="Search sessions..."
      title="Sessions"
    />
  );
}
