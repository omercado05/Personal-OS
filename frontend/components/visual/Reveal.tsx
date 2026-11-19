"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useSyncExternalStore, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;
const VISIBLE = { opacity: 1, y: 0 };
const HIDDEN = { opacity: 0, y: 16 };

/** `false` en el servidor y en la hidratación; `true` una vez montado en el cliente. */
const subscribeNever = () => () => {};

/**
 * Estado de revelado compartido. En el servidor, en el primer render del
 * cliente y con `prefers-reduced-motion` el contenido está en su estado final
 * visible (sin `opacity: 0` en el HTML ni desajuste de hidratación). Solo tras
 * montar y sin reducción de movimiento se oculta y se revela al entrar en el
 * viewport. `amount: "some"` evita que elementos muy altos nunca se revelen.
 */
function useReveal(once: boolean) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const armed = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const inView = useInView(ref, { once, amount: "some", margin: "0px 0px -10% 0px" });

  return { ref, animated: armed && !reduceMotion, shown: !armed || !!reduceMotion || inView };
}

type RevealProps = {
  children: ReactNode;
  as?: "div" | "section" | "li";
  className?: string;
  delay?: number;
  once?: boolean;
};

/** Aparece con un fundido y un leve ascenso al entrar en el viewport. */
export function Reveal({ children, as = "div", className, delay = 0, once = true }: RevealProps) {
  const { ref, animated, shown } = useReveal(once);
  const MotionTag = motion[as];

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial={false}
      animate={shown ? VISIBLE : HIDDEN}
      transition={animated && shown ? { duration: 0.48, ease: EASE, delay } : { duration: 0 }}
    >
      {children}
    </MotionTag>
  );
}

type StaggerProps = {
  children: ReactNode;
  as?: "div" | "ul" | "ol";
  className?: string;
  step?: number;
};

/**
 * Contenedor de cascada: sus `StaggerItem` aparecen escalonados `step`
 * segundos entre sí al entrar en el viewport.
 */
export function Stagger({ children, as = "div", className, step = 0.06 }: StaggerProps) {
  const { ref, shown } = useReveal(true);
  const MotionTag = motion[as];

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial={false}
      animate={shown ? "visible" : "hidden"}
      variants={{
        hidden: { transition: { duration: 0 } },
        visible: { transition: { staggerChildren: step } },
      }}
    >
      {children}
    </MotionTag>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  as?: "div" | "li";
  className?: string;
};

/** Elemento de una cascada `Stagger`; hereda su estado `hidden`/`visible`. */
export function StaggerItem({ children, as = "div", className }: StaggerItemProps) {
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { ...HIDDEN, transition: { duration: 0 } },
        visible: { ...VISIBLE, transition: { duration: 0.48, ease: EASE } },
      }}
    >
      {children}
    </MotionTag>
  );
}
