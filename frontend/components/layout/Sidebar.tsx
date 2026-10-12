"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHexclaveApp, useUser } from "@hexclave/next";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/projects", label: "Projects" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const app = useHexclaveApp();
  const user = useUser();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Link href="/dashboard">Personal OS</Link>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname?.startsWith(item.href) ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar__footer">
        <div className="user">
          <div className="user__name">{user?.displayName ?? user?.primaryEmail ?? "Usuario"}</div>
          <button
            type="button"
            className="ghost small"
            onClick={() => void app.redirectToSignOut()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
