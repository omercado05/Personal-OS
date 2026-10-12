import { describe, expect, it } from "vitest";

import { resolveAuthConfig } from "./config.js";

type HexclaveEnv = Parameters<typeof resolveAuthConfig>[0];

function hexclave(overrides: Partial<HexclaveEnv> = {}): HexclaveEnv {
  return {
    apiUrl: undefined,
    internalApiUrl: undefined,
    projectId: undefined,
    publishableClientKey: undefined,
    secretServerKey: undefined,
    jwksUrl: undefined,
    issuer: undefined,
    audience: undefined,
    ...overrides,
  };
}

describe("resolveAuthConfig", () => {
  it("devuelve null si no hay nada configurado", () => {
    expect(resolveAuthConfig(hexclave())).toBeNull();
  });

  it("usa los valores explícitos cuando están presentes", () => {
    expect(
      resolveAuthConfig(
        hexclave({
          jwksUrl: "http://localhost:8102/jwks.json",
          issuer: "http://localhost:8102/api/v1/projects/p",
          audience: "p",
        }),
      ),
    ).toEqual({
      jwksUrl: "http://localhost:8102/jwks.json",
      issuer: "http://localhost:8102/api/v1/projects/p",
      audience: "p",
    });
  });

  it("deriva issuer/audience/jwksUrl del project ID y las URLs de la API", () => {
    expect(
      resolveAuthConfig({
        apiUrl: "http://localhost:8102",
        internalApiUrl: "http://hexclave-server:8102",
        projectId: "proj-1",
        publishableClientKey: undefined,
        secretServerKey: undefined,
        jwksUrl: undefined,
        issuer: undefined,
        audience: undefined,
      }),
    ).toEqual({
      issuer: "http://localhost:8102/api/v1/projects/proj-1",
      audience: "proj-1",
      jwksUrl: "http://hexclave-server:8102/api/v1/projects/proj-1/.well-known/jwks.json",
    });
  });

  it("usa la URL pública para el JWKS si no hay URL interna", () => {
    const result = resolveAuthConfig({
      apiUrl: "http://localhost:8102",
      internalApiUrl: undefined,
      projectId: "proj-1",
      publishableClientKey: undefined,
      secretServerKey: undefined,
      jwksUrl: undefined,
      issuer: undefined,
      audience: undefined,
    });

    expect(result?.jwksUrl).toBe(
      "http://localhost:8102/api/v1/projects/proj-1/.well-known/jwks.json",
    );
  });

  it("lanza si la configuración está incompleta", () => {
    expect(() => resolveAuthConfig(hexclave({ issuer: "solo-issuer" }))).toThrow(
      /Configuración de autenticación incompleta/,
    );
  });

  it("lanza si solo hay project ID pero no URLs de la API", () => {
    expect(() => resolveAuthConfig(hexclave({ projectId: "proj-1" }))).toThrow(
      /Configuración de autenticación incompleta/,
    );
  });
});
