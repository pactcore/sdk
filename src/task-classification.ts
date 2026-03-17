/**
 * Task classification utilities per PACT Whitepaper §5.1.
 *
 * Categories:
 *  - physical: requires physical presence (location-bound, >0km constraint)
 *  - digital: remote/online work (no location constraint)
 *  - verification: validation/review tasks (skills include verification keywords)
 *  - micro: small quick tasks (low payment, low capacity)
 */

import type { GeoPoint, TaskConstraints } from "./types";

export type TaskCategory = "physical" | "digital" | "verification" | "micro";

const VALID_CATEGORIES: readonly TaskCategory[] = ["physical", "digital", "verification", "micro"];

const VERIFICATION_SKILL_KEYWORDS = [
  "review",
  "verify",
  "validate",
  "audit",
  "check",
  "inspect",
  "evaluate",
  "assess",
  "moderate",
  "label",
  "annotate",
  "tag",
  "classify",
  "qa",
  "quality",
];

const MICRO_TASK_PAYMENT_THRESHOLD_CENTS = 500;
const MICRO_TASK_CAPACITY_THRESHOLD = 2;

export function isValidTaskCategory(value: unknown): value is TaskCategory {
  return typeof value === "string" && (VALID_CATEGORIES as readonly string[]).includes(value);
}

export function validateTaskCategory(category: unknown): TaskCategory {
  if (!isValidTaskCategory(category)) {
    throw new Error(
      `Invalid task category: ${String(category)}. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
    );
  }
  return category;
}

/**
 * Auto-classify a task based on its constraints, payment, and skills.
 *
 * Priority order:
 * 1. If payment ≤ threshold AND capacity ≤ threshold → micro
 * 2. If skills contain verification keywords → verification
 * 3. If maxDistanceKm > 0 and location is non-zero → physical
 * 4. Otherwise → digital
 */
export function classifyTask(input: {
  constraints: TaskConstraints;
  paymentCents: number;
  location?: GeoPoint;
}): TaskCategory {
  const { constraints, paymentCents, location } = input;

  if (
    paymentCents > 0 &&
    paymentCents <= MICRO_TASK_PAYMENT_THRESHOLD_CENTS &&
    (constraints.capacityRequired ?? 1) <= MICRO_TASK_CAPACITY_THRESHOLD
  ) {
    return "micro";
  }

  if (hasVerificationSkills(constraints.requiredSkills ?? [])) {
    return "verification";
  }

  if (isLocationBound(constraints, location)) {
    return "physical";
  }

  return "digital";
}

export interface TaskCategoryPolicy {
  category: TaskCategory;
  requiresLocation: boolean;
  requiresZKLocationProof: boolean;
  maxValidatorCount: number;
  minValidatorCount: number;
  autoVerificationEligible: boolean;
  maxPaymentCents: number | null;
}

export function getTaskCategoryPolicy(category: TaskCategory): TaskCategoryPolicy {
  switch (category) {
    case "physical":
      return {
        category,
        requiresLocation: true,
        requiresZKLocationProof: true,
        maxValidatorCount: 5,
        minValidatorCount: 1,
        autoVerificationEligible: false,
        maxPaymentCents: null,
      };
    case "digital":
      return {
        category,
        requiresLocation: false,
        requiresZKLocationProof: false,
        maxValidatorCount: 3,
        minValidatorCount: 1,
        autoVerificationEligible: true,
        maxPaymentCents: null,
      };
    case "verification":
      return {
        category,
        requiresLocation: false,
        requiresZKLocationProof: false,
        maxValidatorCount: 7,
        minValidatorCount: 2,
        autoVerificationEligible: false,
        maxPaymentCents: null,
      };
    case "micro":
      return {
        category,
        requiresLocation: false,
        requiresZKLocationProof: false,
        maxValidatorCount: 1,
        minValidatorCount: 0,
        autoVerificationEligible: true,
        maxPaymentCents: MICRO_TASK_PAYMENT_THRESHOLD_CENTS,
      };
  }
}

function hasVerificationSkills(skills: string[]): boolean {
  return skills.some((skill) => {
    const lower = skill.toLowerCase();
    return VERIFICATION_SKILL_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}

function isLocationBound(constraints: TaskConstraints, location?: GeoPoint): boolean {
  return (
    (constraints.maxDistanceKm ?? 0) > 0 &&
    location !== undefined &&
    !(location.latitude === 0 && location.longitude === 0)
  );
}
