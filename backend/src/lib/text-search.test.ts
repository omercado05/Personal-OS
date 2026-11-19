import { describe, expect, it } from "vitest";
import { everyTermMatches, searchTerms } from "./text-search.js";

describe("searchTerms", () => {
  it("separa por espacios y descarta los vacíos", () => {
    expect(searchTerms("  docker   backup ")).toEqual(["docker", "backup"]);
  });

  it("deduplica sin distinguir mayúsculas y conserva la primera grafía", () => {
    expect(searchTerms("Docker docker DOCKER")).toEqual(["Docker"]);
  });

  it("devuelve una lista vacía si solo hay espacios", () => {
    expect(searchTerms("   ")).toEqual([]);
  });

  it("limita a 8 términos", () => {
    const terms = searchTerms("a b c d e f g h i j");
    expect(terms).toHaveLength(8);
    expect(terms[0]).toBe("a");
    expect(terms[7]).toBe("h");
  });
});

describe("everyTermMatches", () => {
  it("exige que cada término cumpla alguna de sus condiciones", () => {
    expect(everyTermMatches(["a", "b"], (t) => [{ title: { contains: t } }])).toEqual({
      AND: [{ OR: [{ title: { contains: "a" } }] }, { OR: [{ title: { contains: "b" } }] }],
    });
  });
});
