import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AdminPanelContextType {
  isOpen: boolean;
  panelWidth: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AdminPanelContext = createContext<AdminPanelContextType | null>(null);

const PANEL_WIDTH = 320;
const SESSION_KEY = "admin_panel_open_on_mount";

export function AdminPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const shouldOpen = sessionStorage.getItem(SESSION_KEY);
      if (shouldOpen === "true") {
        sessionStorage.removeItem(SESSION_KEY);
        return true;
      }
    }
    return false;
  });

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return (
    <AdminPanelContext.Provider value={{ isOpen, panelWidth: PANEL_WIDTH, open, close, toggle }}>
      {children}
    </AdminPanelContext.Provider>
  );
}

export function useAdminPanel() {
  const context = useContext(AdminPanelContext);
  if (!context) {
    throw new Error("useAdminPanel must be used within AdminPanelProvider");
  }
  return context;
}

export function useAdminPanelOptional() {
  return useContext(AdminPanelContext);
}

export function prepareOpenOnMount() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, "true");
  }
}
