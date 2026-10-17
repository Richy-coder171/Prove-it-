const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function closeToQuote(quote, source) {
  const words = source.split(" ");
  const quoteWords = quote.split(" ");
  const targetLength = quote.length;
  const low = Math.max(1, quoteWords.length - 2);
  const high = Math.min(words.length, quoteWords.length + 2);
  for (let size = low; size <= high; size += 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const window = words.slice(start, start + size).join(" ");
      if (Math.abs(window.length - targetLength) > targetLength * 0.2) continue;
      if (
        1 -
          levenshtein(quote, window) / Math.max(quote.length, window.length) >=
        0.85
      )
        return true;
    }
  }
  return false;
}

export function validateEvidence(evidence = [], sources = []) {
  const sourceTexts = sources
    .filter(Boolean)
    .map((text) => normalize(String(text)));
  const valid = [];
  const rejected = [];
  for (const quote of evidence) {
    const normalized = normalize(String(quote));
    if (!normalized) {
      rejected.push(quote);
      continue;
    }
    const exists = sourceTexts.some(
      (source) =>
        source.includes(normalized) ||
        (normalized.length >= 12 && closeToQuote(normalized, source)),
    );
    (exists ? valid : rejected).push(quote);
  }
  return { valid: [...new Set(valid)], rejected };
}
