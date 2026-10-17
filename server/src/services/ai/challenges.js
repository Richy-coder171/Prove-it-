import Challenge from "../../models/Challenge.js";
import { ChallengePackageSchema } from "./schemas.js";
import { callClaudeJSON } from "./client.js";
import { challengePrompt } from "./prompts/challenge.js";
import { aiCacheKey, withFallback } from "./cache.js";

export async function generateChallenge({
  owner,
  mode,
  sourceText,
  instruction = "",
}) {
  const prompt = challengePrompt(mode, sourceText, instruction);
  const input = { mode, sourceText, instruction };
  const challengePackage = await withFallback(
    aiCacheKey("challenge", input),
    () => callClaudeJSON({ ...prompt, schema: ChallengePackageSchema }),
    { schema: ChallengePackageSchema },
  );
  return Challenge.create({
    ...challengePackage,
    owner,
    mode,
    sourceText,
    status: "draft",
  });
}
