import { createHash } from "node:crypto";
import AiCache from "../../models/AiCache.js";
import { env } from "../../config/env.js";

export function aiCacheKey(type, input) {
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  return `${type}:${digest}`;
}

export async function withFallback(
  key,
  liveFn,
  { CacheModel = AiCache, demoMode = env.DEMO_MODE, schema } = {},
) {
  let cached;
  try {
    const query = CacheModel.findOne({ key });
    cached = query?.lean ? await query.lean() : await query;
  } catch {
    cached = null;
  }
  if (cached && schema) {
    try {
      cached.response = schema.parse(cached.response);
    } catch {
      cached = null;
    }
  }
  if (cached && demoMode) {
    process.stdout.write(`[ai] source=cache key=${key.split(":")[0]}\n`);
    return cached.response;
  }
  try {
    const liveResponse = await liveFn();
    const response = schema ? schema.parse(liveResponse) : liveResponse;
    try {
      await CacheModel.updateOne(
        { key },
        { $set: { response } },
        { upsert: true },
      );
    } catch {
      /* caching cannot break a successful AI response */
    }
    return response;
  } catch (error) {
    if (cached) {
      process.stdout.write(
        `[ai] source=cache key=${key.split(":")[0]} fallback=live-error\n`,
      );
      return cached.response;
    }
    throw error;
  }
}
