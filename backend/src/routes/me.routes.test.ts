import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import type { TokenVerifier } from "../auth/jwt-verifier.js";
import { unauthorized } from "../lib/errors.js";
import { createAuthHook, extractBearerToken } from "../middleware/auth.js";
import type { AuthenticatedUser, UserService } from "../services/user.service.js";

const fakeUser: Pick<AuthenticatedUser, "email" | "displayName"> = {
  email: "user@example.com",
  displayName: "Ada",
};

const users: UserService = {
  async syncFromClaims(claims) {
    return {
      id: 1n,
      stackUserId: claims.sub,
      email: claims.email ?? fakeUser.email,
      displayName: claims.name ?? fakeUser.displayName,
    };
  },
};

/** Verificador que acepta solo el token literal "valid-token". */
const acceptingVerifier: TokenVerifier = {
  async verify(token: string) {
    if (token !== "valid-token") {
      throw unauthorized("Token inválido o expirado");
    }
    return { sub: "user-123", email: "user@example.com", name: "Ada" };
  },
};

function buildAppWithAuth(verifier: TokenVerifier | null) {
  return buildApp({ dependencies: { auth: createAuthHook({ verifier, users }) } });
}

describe("GET /api/v1/me (protegido)", () => {
  let app: ReturnType<typeof buildApp> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("responde 401 sin cabecera Authorization", async () => {
    app = buildAppWithAuth(acceptingVerifier);
    const response = await app.inject({ method: "GET", url: "/api/v1/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("responde 401 si el esquema de Authorization no es Bearer", async () => {
    app = buildAppWithAuth(acceptingVerifier);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("responde 401 si el token no es válido", async () => {
    app = buildAppWithAuth(acceptingVerifier);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer bad-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("responde 200 con el usuario sincronizado y el envelope estándar", async () => {
    app = buildAppWithAuth(acceptingVerifier);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: { id: "1", email: "user@example.com", displayName: "Ada" },
    });
  });

  it("responde 503 si la autenticación no está configurada", async () => {
    app = buildAppWithAuth(null);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toMatchObject({ code: "AUTH_NOT_CONFIGURED" });
  });
});

describe("extractBearerToken", () => {
  it("extrae el token de una cabecera Bearer válida", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractBearerToken("bearer abc")).toBe("abc");
  });

  it("devuelve null si la cabecera falta o no es Bearer", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("Bearer a b")).toBeNull();
  });
});
