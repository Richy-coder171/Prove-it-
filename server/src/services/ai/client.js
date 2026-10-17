import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";

const client = env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      timeout: 30_000,
      maxRetries: 0,
    })
  : null;

function extractJson(text) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first < 0 || last < first)
    throw new Error("The AI response did not contain a JSON object");
  return JSON.parse(clean.slice(first, last + 1));
}

export async function callClaudeJSON({
  system,
  user,
  schema,
  maxTokens = 2400,
  temperature = 0.2,
}) {
  if (!client) {
    const error = new Error(
      "Challenge generation needs ANTHROPIC_API_KEY. Add it to server/.env or enable demo mode after the cache is seeded.",
    );
    error.status = 503;
    error.code = "AI_UNAVAILABLE";
    throw error;
  }

  let feedback = "";
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const startedAt = performance.now();
      const response = await client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: `${user}${feedback}` }],
      });
      if (env.NODE_ENV === "development") {
        process.stdout.write(
          `[ai] ${Math.round(performance.now() - startedAt)}ms; input ${response.usage.input_tokens}; output ${response.usage.output_tokens}\n`,
        );
      }
      const text = response.content.find(
        (block) => block.type === "text",
      )?.text;
      return schema.parse(extractJson(text ?? ""));
    } catch (error) {
      lastError = error;
      if (error.status && error.status < 500 && error.status !== 429) break;
      feedback = `\n\nThe last attempt failed: ${error.message}. Return a corrected JSON object only.`;
      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 300 * (attempt + 1)),
        );
    }
  }
  lastError.status ??= 502;
  lastError.code ??= "AI_REQUEST_FAILED";
  throw lastError;
}
