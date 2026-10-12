"use client";

import { useHexclaveApp } from "@hexclave/next";
import { useCallback } from "react";

import { apiFetch } from "./api";

/**
 * Devuelve una función para llamar a la API enviando automáticamente el access
 * token de Hexclave. Ejemplo: `await api<{ data: Project }>("/api/v1/projects/1")`.
 */
export function useApi() {
  const app = useHexclaveApp();

  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const token = await app.getAccessToken();
      return apiFetch<T>(token, path, init);
    },
    [app],
  );
}
