import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// Elicitation request type
export type ElicitationRequest = {
  id: string;
  message: string;
};

// Internal request with resolver
type InternalElicitationRequest = ElicitationRequest & {
  resolve: (answer: string) => void;
  reject: (reason?: unknown) => void;
};

// Context value type
type ElicitationContextValue = {
  pendingRequest: ElicitationRequest | null;
  showElicitation: (message: string) => Promise<string>;
  respond: (answer: string) => void;
  reject: () => void;
};

const ElicitationContext = createContext<ElicitationContextValue | null>(null);

type ElicitationProviderProps = {
  children: ReactNode;
};

export function ElicitationProvider({ children }: ElicitationProviderProps) {
  const [pendingRequest, setPendingRequest] =
    useState<InternalElicitationRequest | null>(null);
  const requestIdRef = useRef(0);

  const showElicitation = useCallback(
    (message: string): Promise<string> =>
      new Promise((resolvePromise, rejectPromise) => {
        requestIdRef.current += 1;
        const id = `elicitation-${requestIdRef.current}`;
        setPendingRequest({
          id,
          message,
          resolve: resolvePromise,
          reject: rejectPromise,
        });
      }),
    []
  );

  const respond = useCallback(
    (answer: string) => {
      if (pendingRequest) {
        pendingRequest.resolve(answer);
        setPendingRequest(null);
      }
    },
    [pendingRequest]
  );

  const reject = useCallback(() => {
    if (pendingRequest) {
      pendingRequest.reject(new Error("User dismissed elicitation"));
      setPendingRequest(null);
    }
  }, [pendingRequest]);

  // Expose only the public request info (without resolve/reject)
  const publicRequest: ElicitationRequest | null = pendingRequest
    ? { id: pendingRequest.id, message: pendingRequest.message }
    : null;

  const value = useMemo(
    () => ({
      pendingRequest: publicRequest,
      showElicitation,
      respond,
      reject,
    }),
    [publicRequest, showElicitation, respond, reject]
  );

  return (
    <ElicitationContext.Provider value={value}>
      {children}
    </ElicitationContext.Provider>
  );
}

export function useElicitation(): ElicitationContextValue {
  const ctx = useContext(ElicitationContext);
  if (!ctx) {
    throw new Error(
      "useElicitation must be used within an ElicitationProvider"
    );
  }
  return ctx;
}
