"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Encierra el foco dentro de `containerRef` mientras `active` sea true, cierra
 * con `Escape` (`onEscape`) y devuelve el foco al elemento que lo tenía cuando
 * se desactivó. Pensado para diálogos y hojas modales.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
): void {
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function focusable(): HTMLElement[] {
      if (!container) {
        return [];
      }
      return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
    }

    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        return;
      }
      const current = document.activeElement;
      const outside = !container?.contains(current);
      if (event.shiftKey) {
        if (current === first || outside) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last || outside) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}
