"use client";

import { useHexclaveApp, useUser } from "@hexclave/next";
import { LogOut, UserRound, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { useFocusTrap } from "@/lib/use-focus-trap";

import { initials, NAV_ITEMS } from "./nav";

/**
 * Barra de navegación inferior para móvil/tablet, más una hoja de «Cuenta»
 * (avatar + cerrar sesión) que sustituye al pie de la barra lateral de
 * escritorio. Solo se muestra por debajo de 900px (ver `globals.css`).
 *
 * La hoja se comporta como diálogo modal: `Escape` la cierra, atrapa el foco
 * mientras está abierta y lo devuelve al botón «Cuenta» al cerrarse.
 */
export default function MobileNav() {
  const pathname = usePathname();
  const app = useHexclaveApp();
  const user = useUser();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeSheet = useCallback(() => setOpen(false), []);

  useFocusTrap(open, sheetRef, closeSheet);

  const name = user?.displayName ?? user?.primaryEmail ?? "Usuario";

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            className="mobile-sheet-backdrop"
            aria-label="Cerrar menú de cuenta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSheet}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={sheetRef}
            id="account-sheet"
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Cuenta"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="user">
              <span className="user__avatar" aria-hidden="true">
                {initials(name)}
              </span>
              <span className="user__name">{name}</span>
            </div>
            <button type="button" className="ghost" onClick={() => void app.redirectToSignOut()}>
              <LogOut size={16} aria-hidden="true" />
              Cerrar sesión
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav className="mobile-nav" aria-label="Navegación principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={closeSheet}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={open ? "active" : undefined}
          aria-expanded={open}
          aria-controls="account-sheet"
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <UserRound size={20} aria-hidden="true" />}
          <span>Cuenta</span>
        </button>
      </nav>
    </>
  );
}
