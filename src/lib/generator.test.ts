/**
 * Tests for domain generator
 */

import { createGenerator, PatternTemplate } from "@/lib/generator";

describe("Domain Generator", () => {
  describe("Pattern expansion", () => {
    it("should generate CVCV pattern names", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 10,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
        allowDoubles: false,
        ensureUnique: true,
      });

      expect(result.domains.length).toBe(10);
      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name.length).toBe(4);
        // Should be pronounceable
        expect(/^[a-z]{4}$/.test(name)).toBe(true);
      });
    });

    it("should respect length constraint", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 20,
        length: 6,
        pattern: "CVCV",
        tlds: ["com"],
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name.length).toBe(6);
      });
    });
  });

  describe("TLDs", () => {
    it("should generate domains with multiple TLDs", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 6,
        length: 4,
        pattern: "CVCV",
        tlds: ["com", "io", "co"],
        allowDoubles: false,
        ensureUnique: true,
      });

      expect(result.domains.length).toBe(6);
      const tlds = new Set(result.domains.map((d) => d.split(".")[1]));
      expect(tlds.has("com")).toBe(true);
      expect(tlds.has("io")).toBe(true);
      expect(tlds.has("co")).toBe(true);
    });
  });

  describe("Constraints", () => {
    it("should exclude specified letters", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 20,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
        excludeLetters: ["x", "z", "q"],
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name).not.toMatch(/[xzq]/);
      });
    });

    it("should honor prefix constraint", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 10,
        length: 6,
        pattern: "CVCV",
        tlds: ["com"],
        prefix: "br",
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name.startsWith("br")).toBe(true);
        expect(name.length).toBe(6);
      });
    });

    it("should honor suffix constraint", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 10,
        length: 6,
        pattern: "CVCV",
        tlds: ["com"],
        suffix: "ly",
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name.endsWith("ly")).toBe(true);
        expect(name.length).toBe(6);
      });
    });

    it("should reject forbidden bigrams", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 50,
        length: 5,
        pattern: "CVCVC",
        tlds: ["com"],
        forbiddenBigrams: ["ng", "ng"],
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        expect(name).not.toMatch(/ng/i);
      });
    });

    it("should prevent double letters when disabled", () => {
      const generator = createGenerator(12345);
      const result = generator.generate({
        count: 50,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
        allowDoubles: false,
        ensureUnique: true,
      });

      result.domains.forEach((domain) => {
        const name = domain.replace(".com", "");
        for (let i = 0; i < name.length - 1; i++) {
          expect(name[i] !== name[i + 1]).toBe(true);
        }
      });
    });
  });

  describe("Seeded generation", () => {
    it("should produce same results with same seed", () => {
      const generator1 = createGenerator(999);
      const result1 = generator1.generate({
        count: 20,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
        seed: 999,
        allowDoubles: false,
        ensureUnique: true,
      });

      const generator2 = createGenerator(999);
      const result2 = generator2.generate({
        count: 20,
        length: 4,
        pattern: "CVCV",
        tlds: ["com"],
        seed: 999,
        allowDoubles: false,
        ensureUnique: true,
      });

      expect(result1.domains).toEqual(result2.domains);
    });
  });
});
