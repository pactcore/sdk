import { describe, expect, test } from "bun:test";
import {
  classifyTask,
  getTaskCategoryPolicy,
  isValidTaskCategory,
  validateTaskCategory,
  type TaskCategory,
  type TaskCategoryPolicy,
} from "../src/task-classification";

describe("isValidTaskCategory", () => {
  test("accepts valid categories", () => {
    for (const cat of ["physical", "digital", "verification", "micro"] as const) {
      expect(isValidTaskCategory(cat)).toBe(true);
    }
  });
  test("rejects invalid values", () => {
    expect(isValidTaskCategory("unknown")).toBe(false);
    expect(isValidTaskCategory(42)).toBe(false);
    expect(isValidTaskCategory(null)).toBe(false);
    expect(isValidTaskCategory(undefined)).toBe(false);
    expect(isValidTaskCategory("")).toBe(false);
  });
});

describe("validateTaskCategory", () => {
  test("returns valid category", () => {
    expect(validateTaskCategory("physical")).toBe("physical");
    expect(validateTaskCategory("micro")).toBe("micro");
  });
  test("throws on invalid", () => {
    expect(() => validateTaskCategory("nope")).toThrow(/Invalid task category/);
  });
});

describe("classifyTask", () => {
  const baseConstraints = { maxDistanceKm: 0, requiredSkills: [], capacityRequired: 1 };

  test("micro: low payment + low capacity", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, capacityRequired: 1 },
        paymentCents: 200,
      }),
    ).toBe("micro");
  });

  test("micro threshold boundary: exactly 500 cents", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, capacityRequired: 2 },
        paymentCents: 500,
      }),
    ).toBe("micro");
  });

  test("not micro when payment exceeds threshold", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, capacityRequired: 1 },
        paymentCents: 501,
      }),
    ).toBe("digital");
  });

  test("not micro when capacity exceeds threshold", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, capacityRequired: 3 },
        paymentCents: 200,
      }),
    ).toBe("digital");
  });

  test("not micro when payment is 0", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, capacityRequired: 1 },
        paymentCents: 0,
      }),
    ).toBe("digital");
  });

  test("verification: skills contain verification keywords", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, requiredSkills: ["code review", "testing"] },
        paymentCents: 1000,
      }),
    ).toBe("verification");
  });

  test("verification: various keywords", () => {
    for (const keyword of ["audit", "validate", "inspect", "moderate", "label", "qa"]) {
      expect(
        classifyTask({
          constraints: { ...baseConstraints, requiredSkills: [keyword] },
          paymentCents: 1000,
        }),
      ).toBe("verification");
    }
  });

  test("physical: location-bound task", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, maxDistanceKm: 10 },
        paymentCents: 1000,
        location: { latitude: 37.7749, longitude: -122.4194 },
      }),
    ).toBe("physical");
  });

  test("digital: no location constraint", () => {
    expect(
      classifyTask({
        constraints: baseConstraints,
        paymentCents: 1000,
      }),
    ).toBe("digital");
  });

  test("digital: maxDistanceKm > 0 but location is origin (0,0)", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, maxDistanceKm: 10 },
        paymentCents: 1000,
        location: { latitude: 0, longitude: 0 },
      }),
    ).toBe("digital");
  });

  test("digital: maxDistanceKm > 0 but no location provided", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, maxDistanceKm: 10 },
        paymentCents: 1000,
      }),
    ).toBe("digital");
  });

  test("micro takes priority over verification", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, requiredSkills: ["review"], capacityRequired: 1 },
        paymentCents: 100,
      }),
    ).toBe("micro");
  });

  test("verification takes priority over physical", () => {
    expect(
      classifyTask({
        constraints: { ...baseConstraints, requiredSkills: ["audit"], maxDistanceKm: 5 },
        paymentCents: 1000,
        location: { latitude: 40.0, longitude: -74.0 },
      }),
    ).toBe("verification");
  });
});

describe("getTaskCategoryPolicy", () => {
  test("physical policy", () => {
    const p = getTaskCategoryPolicy("physical");
    expect(p.category).toBe("physical");
    expect(p.requiresLocation).toBe(true);
    expect(p.requiresZKLocationProof).toBe(true);
    expect(p.autoVerificationEligible).toBe(false);
    expect(p.maxPaymentCents).toBeNull();
  });

  test("digital policy", () => {
    const p = getTaskCategoryPolicy("digital");
    expect(p.category).toBe("digital");
    expect(p.requiresLocation).toBe(false);
    expect(p.autoVerificationEligible).toBe(true);
  });

  test("verification policy", () => {
    const p = getTaskCategoryPolicy("verification");
    expect(p.category).toBe("verification");
    expect(p.minValidatorCount).toBe(2);
    expect(p.maxValidatorCount).toBe(7);
  });

  test("micro policy", () => {
    const p = getTaskCategoryPolicy("micro");
    expect(p.category).toBe("micro");
    expect(p.autoVerificationEligible).toBe(true);
    expect(p.maxPaymentCents).toBe(500);
    expect(p.minValidatorCount).toBe(0);
  });

  test("all categories return valid policy shape", () => {
    for (const cat of ["physical", "digital", "verification", "micro"] as TaskCategory[]) {
      const p = getTaskCategoryPolicy(cat);
      expect(p.category).toBe(cat);
      expect(typeof p.requiresLocation).toBe("boolean");
      expect(typeof p.requiresZKLocationProof).toBe("boolean");
      expect(typeof p.maxValidatorCount).toBe("number");
      expect(typeof p.minValidatorCount).toBe("number");
      expect(typeof p.autoVerificationEligible).toBe("boolean");
    }
  });
});
