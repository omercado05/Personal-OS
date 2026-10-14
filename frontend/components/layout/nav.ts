import { BookOpen, FolderKanban, LayoutDashboard, type LucideIcon } from "lucide-react";

/** Elemento de navegación principal del shell. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navegación principal, compartida por la barra lateral y la barra móvil. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

/** Iniciales para el avatar (p. ej. «Ada Lovelace» → «AL»). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
