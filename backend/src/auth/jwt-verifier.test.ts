import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../lib/errors.js";
import { createTokenVerifier, type TokenVerifier } from "./jwt-verifier.js";

const ISSUER = "http://localhost:8102/api/v1/projects/test-project";
const AUDIENCE = "test-project";
const KID = "test-key";

let signingKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let verifier: TokenVerifier;

async function signToken(
  claims: Record<string, unknown>,
  options: { issuer?: string; audience?: string; expiresIn?: string; kid?: string } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: options.kid ?? KID })
    .setIssuedAt()
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? AUDIENCE)
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign(signingKey);
}

async function expectRejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error("Se esperaba que la promesa fuese rechazada");
}

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
  signingKey = privateKey;

  const jwk = await exportJWK(publicKey);
  const publicJwk = { ...jwk, kid: KID, alg: "ES256", use: "sig" };
  verifier = createTokenVerifier(createLocalJWKSet({ keys: [publicJwk] }), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
});

describe("createTokenVerifier", () => {
  it("acepta un token válido y extrae la identidad", async () => {
    const token = await signToken({
      sub: "user-123",
      email: "user@example.com",
      name: "Ada Lovelace",
    });

    await expect(verifier.verify(token)).resolves.toEqual({
      sub: "user-123",
      email: "user@example.com",
      name: "Ada Lovelace",
    });
  });

  it("acepta un token sin email ni nombre", async () => {
    const token = await signToken({ sub: "user-123" });

    await expect(verifier.verify(token)).resolves.toEqual({ sub: "user-123" });
  });

  it("normaliza a undefined los claims email/name emitidos como null", async () => {
    const token = await signToken({ sub: "user-123", email: null, name: null });

    const claims = await verifier.verify(token);
    expect(claims).toEqual({ sub: "user-123", email: undefined, name: undefined });
  });

  it("rechaza (401) un token sin claim sub", async () => {
    const token = await signToken({ email: "user@example.com" });

    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("rechaza (401) un token con issuer incorrecto", async () => {
    const token = await signToken({ sub: "user-123" }, { issuer: "https://evil.example" });

    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
  });

  it("rechaza (401) un token con audience distinta", async () => {
    const token = await signToken({ sub: "user-123" }, { audience: "otro-proyecto" });

    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
  });

  it("rechaza (401) un token expirado", async () => {
    const token = await signToken({ sub: "user-123" }, { expiresIn: "-1m" });

    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
  });

  it("rechaza (401) un token con firma de otra clave", async () => {
    const { privateKey: otherKey } = await generateKeyPair("ES256");
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "ES256", kid: KID })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("1h")
      .sign(otherKey);

    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
  });

  it("rechaza (401) una cadena que no es un JWT", async () => {
    const error = await expectRejection(verifier.verify("no-es-un-token"));
    expect(error.statusCode).toBe(401);
  });

  it("responde 503 si el proveedor de claves falla (error no-JOSE)", async () => {
    const brokenVerifier = createTokenVerifier(
      async () => {
        throw new Error("network down");
      },
      { issuer: ISSUER, audience: AUDIENCE },
    );

    const token = await signToken({ sub: "user-123" });
    const error = await expectRejection(brokenVerifier.verify(token));
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe("AUTH_PROVIDER_UNAVAILABLE");
  });

  it("rechaza (401) un token cuyo kid no está en el JWKS", async () => {
    // El token apunta a un clave inexistente en el JWKS (ERR_JWKS_NO_MATCHING_KEY):
    // es un token inválido, no un fallo del proveedor.
    const token = await signToken({ sub: "user-123" }, { kid: "otro-kid" });
    const error = await expectRejection(verifier.verify(token));
    expect(error.statusCode).toBe(401);
  });
});
