import { describe, expect, it, vi } from "vitest";
import { aiCacheKey, withFallback } from "../src/services/ai/cache.js";
import {
  ChallengePackageSchema,
  SkillGapGuideSchema,
} from "../src/services/ai/schemas.js";
import { DEMO_CHALLENGE_PACKAGE, DEMO_GUIDE } from "../scripts/demoData.js";

describe("AI cache fallback", () => {
  it("keeps seeded challenge and coaching responses schema-valid", () => {
    expect(
      ChallengePackageSchema.safeParse(DEMO_CHALLENGE_PACKAGE).success,
    ).toBe(true);
    expect(SkillGapGuideSchema.safeParse(DEMO_GUIDE).success).toBe(true);
  });
  it("creates deterministic, input-specific keys", () => {
    expect(aiCacheKey("challenge", { mode: "hiring", text: "x" })).toBe(
      aiCacheKey("challenge", { mode: "hiring", text: "x" }),
    );
    expect(aiCacheKey("challenge", { mode: "founder", text: "x" })).not.toBe(
      aiCacheKey("challenge", { mode: "hiring", text: "x" }),
    );
  });

  it("uses a cached response directly in demo mode", async () => {
    const live = vi.fn();
    const CacheModel = {
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ response: { answer: "cached" } }),
      }),
      updateOne: vi.fn(),
    };
    await expect(
      withFallback("demo:key", live, { CacheModel, demoMode: true }),
    ).resolves.toEqual({ answer: "cached" });
    expect(live).not.toHaveBeenCalled();
  });

  it("falls back to a cached response after a live error", async () => {
    const CacheModel = {
      findOne: vi.fn().mockResolvedValue({ response: "cached" }),
    };
    await expect(
      withFallback(
        "key",
        () => {
          throw new Error("offline");
        },
        { CacheModel, demoMode: false },
      ),
    ).resolves.toBe("cached");
  });
});
