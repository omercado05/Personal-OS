"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { initials, NAV_ITEMS } from "./nav";

/** Barra lateral de escritorio: marca, navegación principal y sesión. */
export default function Sidebar() {
  const pathname = usePathname();
  const app = useHexclaveApp();
  const user = useUser();

  const name = user?.displayName ?? user?.primaryEmail ?? "Usuario";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Link href="/dashboard">
          <span className="brand-mark" aria-hidden="true">
            ◆
          </span>
          <span>Personal OS</span>
        </Link>
      </div>

      <nav className="sidebar__nav" aria-label="Navegación principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="user">
          <span className="user__avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <span className="user__name" title={name}>
            {name}
          </span>
        </div>
        <button type="button" className="ghost small" onClick={() => void app.redirectToSignOut()}>
          <LogOut size={16} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
