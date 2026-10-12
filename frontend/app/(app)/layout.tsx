import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";

/** Layout del área autenticada (sidebar + búsqueda global + contenido). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
