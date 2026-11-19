"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  as?: "div" | "section" | "li";
  className?: string;
  delay?: number;
  once?: boolean;
};

/**
 * Aparece con un fundido y un leve ascenso al entrar en el viewport. Con
 * `prefers-reduced-motion` renderiza el elemento sin animación.
 */
export function Reveal({ children, as = "div", className, delay = 0, once = true }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.48, ease: EASE, delay }}
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
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: step } } }}
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
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: EASE } },
      }}
    >
      {children}
    </MotionTag>
  );
}
