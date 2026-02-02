import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";

import { useTheme } from "#context/theme/index.tsx";

import { SplitBorder } from "./border.ts";

export type ToastVariant = "info" | "success" | "error" | "warning";

export type ToastOptions = {
  variant?: ToastVariant;
  message: string;
  title?: string;
  duration?: number;
};

export type ToastContextValue = {
  show: (options: ToastOptions) => void;
  error: (err: unknown) => void;
  currentToast: ToastOptions | null;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastDisplay() {
  const { currentToast } = useToast();
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();

  if (!currentToast) {
    return null;
  }

  const variant = currentToast.variant ?? "info";
  const maxWidth = Math.min(60, dimensions.width - 6);

  return (
    <box
      alignItems="flex-start"
      backgroundColor={theme.backgroundPanel}
      border={["left", "right"]}
      borderColor={theme[variant]}
      customBorderChars={SplitBorder.customBorderChars}
      justifyContent="center"
      maxWidth={maxWidth}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      position="absolute"
      right={2}
      top={2}
    >
      {currentToast.title && (
        <text attributes={TextAttributes.BOLD} fg={theme.text} marginBottom={1}>
          {currentToast.title}
        </text>
      )}
      <text fg={theme.text} width="100%" wrapMode="word">
        {currentToast.message}
      </text>
    </box>
  );
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((options: ToastOptions) => {
    const duration = options.duration ?? 3000;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCurrentToast(options);

    timeoutRef.current = setTimeout(() => {
      setCurrentToast(null);
    }, duration).unref();
  }, []);

  const error = useCallback(
    (err: unknown) => {
      if (err instanceof Error) {
        show({
          variant: "error",
          message: err.message,
        });
      } else {
        show({
          variant: "error",
          message: "An unknown error has occurred",
        });
      }
    },
    [show]
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const value: ToastContextValue = {
    show,
    error,
    currentToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastDisplay />
    </ToastContext.Provider>
  );
}
