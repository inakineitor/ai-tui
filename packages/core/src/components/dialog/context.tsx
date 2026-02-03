import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Renderable } from "@opentui/core";
import { RGBA } from "@opentui/core";
import {
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
} from "@opentui/react";

import { useTheme } from "#context/theme/index.js";

type DialogStackItem = {
  element: ReactNode;
  onClose?: () => void;
};

export type DialogContextValue = {
  stack: DialogStackItem[];
  size: "medium" | "large";
  replace: (element: ReactNode, onClose?: () => void) => void;
  push: (element: ReactNode, onClose?: () => void) => void;
  pop: () => void;
  clear: () => void;
  setSize: (size: "medium" | "large") => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogProviderProps = {
  children: ReactNode;
};

export function DialogProvider({ children }: DialogProviderProps) {
  const [stack, setStack] = useState<DialogStackItem[]>([]);
  const [size, setSize] = useState<"medium" | "large">("medium");
  const previousFocusRef = useRef<Renderable | null>(null);
  const renderer = useRenderer();

  const saveFocus = useCallback(() => {
    previousFocusRef.current = renderer.currentFocusedRenderable;
    previousFocusRef.current?.blur();
  }, [renderer]);

  const restoreFocus = useCallback(() => {
    setTimeout(() => {
      if (previousFocusRef.current && !previousFocusRef.current.isDestroyed) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }, 0);
  }, []);

  const replace = useCallback(
    (element: ReactNode, onClose?: () => void) => {
      if (stack.length === 0) {
        saveFocus();
      }
      for (const item of stack) {
        item.onClose?.();
      }
      setSize("medium");
      setStack([{ element, onClose }]);
    },
    [stack, saveFocus]
  );

  const push = useCallback(
    (element: ReactNode, onClose?: () => void) => {
      setStack((prev) => {
        if (prev.length === 0) {
          saveFocus();
        }
        return [...prev, { element, onClose }];
      });
    },
    [saveFocus]
  );

  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const current = prev.at(-1);
      current?.onClose?.();
      const newStack = prev.slice(0, -1);
      if (newStack.length === 0) {
        restoreFocus();
      }
      return newStack;
    });
  }, [restoreFocus]);

  const clear = useCallback(() => {
    for (const item of stack) {
      item.onClose?.();
    }
    setSize("medium");
    setStack([]);
    restoreFocus();
  }, [stack, restoreFocus]);

  useKeyboard((evt) => {
    if (evt.name === "escape" && stack.length > 0) {
      const current = stack.at(-1);
      current?.onClose?.();
      setStack((prev) => prev.slice(0, -1));
      if (stack.length <= 1) {
        restoreFocus();
      }
      evt.preventDefault?.();
      evt.stopPropagation?.();
    }
  });

  const value = useMemo<DialogContextValue>(
    () => ({ stack, size, replace, push, pop, clear, setSize }),
    [stack, size, replace, push, pop, clear]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {stack.length > 0 && (
        <Dialog onClose={clear} size={size}>
          {stack.at(-1)?.element}
        </Dialog>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return ctx;
}

type DialogProps = {
  children: ReactNode;
  size?: "medium" | "large";
  onClose: () => void;
};

function Dialog({ children, size = "medium", onClose }: DialogProps) {
  const dimensions = useTerminalDimensions();
  const { theme } = useTheme();
  const renderer = useRenderer();

  const handleBackdropClick = useCallback(() => {
    if (renderer.getSelection()) {
      return;
    }
    onClose();
  }, [renderer, onClose]);

  const handleContentClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      if (renderer.getSelection()) {
        return;
      }
      e.stopPropagation();
    },
    [renderer]
  );

  return (
    <box
      alignItems="center"
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
      height={dimensions.height}
      left={0}
      onMouseUp={handleBackdropClick}
      paddingTop={Math.floor(dimensions.height / 4)}
      position="absolute"
      top={0}
      width={dimensions.width}
    >
      <box
        backgroundColor={theme.backgroundPanel}
        maxWidth={dimensions.width - 2}
        onMouseUp={handleContentClick}
        paddingTop={1}
        width={size === "large" ? 80 : 60}
      >
        {children}
      </box>
    </box>
  );
}
