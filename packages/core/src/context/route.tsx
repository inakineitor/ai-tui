import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// PromptInfo type for initial prompt support
export type PromptInfo = {
  input: string;
  mode?: "normal" | "shell";
  parts: unknown[];
};

// Route types
export type HomeRoute = {
  type: "home";
  initialPrompt?: PromptInfo;
};

export type SessionRoute = {
  type: "session";
  sessionID: string;
  initialPrompt?: PromptInfo;
};

export type Route = HomeRoute | SessionRoute;

// Context value type
type RouteContextValue = {
  route: Route;
  navigate: (route: Route) => void;
};

export type RouteContext = RouteContextValue;

const RouteContext = createContext<RouteContextValue | null>(null);

type RouteProviderProps = {
  children: ReactNode;
  initialRoute?: Route;
};

export function RouteProvider({
  children,
  initialRoute = { type: "home" },
}: RouteProviderProps) {
  const [route, setRoute] = useState<Route>(initialRoute);

  const navigate = useCallback((newRoute: Route) => {
    setRoute(newRoute);
  }, []);

  const value = useMemo(() => ({ route, navigate }), [route, navigate]);

  return (
    <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    throw new Error("useRoute must be used within a RouteProvider");
  }
  return ctx;
}

export function useRouteData<T extends Route["type"]>(_type: T) {
  const { route } = useRoute();
  return route as Extract<Route, { type: T }>;
}

// Type guard helpers
export function isHomeRoute(route: Route): route is HomeRoute {
  return route.type === "home";
}

export function isSessionRoute(route: Route): route is SessionRoute {
  return route.type === "session";
}
