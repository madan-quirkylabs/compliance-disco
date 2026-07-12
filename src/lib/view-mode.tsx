import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ViewMode = "cco" | "engineering" | "marketing" | "auditor";

export const viewModeLabel: Record<ViewMode, string> = {
  cco: "Chief Compliance Officer",
  engineering: "Engineering Lead",
  marketing: "Marketing Lead",
  auditor: "Auditor",
};

// Where each view lands by default. Only affects emphasis and default routes —
// permissions are not modelled in the MVP.
export const viewModeLanding: Record<ViewMode, string> = {
  cco: "/",
  engineering: "/departments/engineering",
  marketing: "/departments/marketing",
  auditor: "/fdo",
};

const KEY = "compliance-disco/view-mode/v1";

const Ctx = createContext<{
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}>({ mode: "cco", setMode: () => {} });

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("cco");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY) as ViewMode | null;
      if (stored && stored in viewModeLabel) setModeState(stored);
    } catch {
      /* ignore */
    }
  }, []);
  const setMode = (m: ViewMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useViewMode() {
  return useContext(Ctx);
}
