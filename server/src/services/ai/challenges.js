import Challenge from "../../models/Challenge.js";
import { ChallengePackageSchema } from "./schemas.js";
import { callClaudeJSON } from "./client.js";
import { challengePrompt } from "./prompts/challenge.js";

export async function generateChallenge({
  owner,
  mode,
  sourceText,
  instruction = "",
}) {
  const prompt = challengePrompt(mode, sourceText, instruction);
  const challengePackage = await callClaudeJSON({
    ...prompt,
    schema: ChallengePackageSchema,
  });
  return Challenge.create({
    ...challengePackage,
    owner,
    mode,
    sourceText,
    status: "draft",
  });
}
