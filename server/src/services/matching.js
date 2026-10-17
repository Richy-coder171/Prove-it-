const words = (values = []) =>
  new Set(
    values.flatMap((value) =>
      String(value)
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((part) => part.length > 1),
    ),
  );

export function scoreMatch(profileSkills = [], tags = []) {
  const skills = words(profileSkills);
  const target = words(tags);
  if (!skills.size || !target.size) return { score: 0, matches: [] };
  const matches = [...target].filter((item) => skills.has(item));
  return { score: Math.round((matches.length / target.size) * 100), matches };
}

export function rankMatches(
  items,
  profileSkills,
  getTags = (item) => item.tags ?? [],
) {
  return items
    .map((item) => {
      const match = scoreMatch(profileSkills, getTags(item));
      return {
        ...item,
        matchScore: match.score,
        whyMatched: match.matches.length
          ? `Matches your ${match.matches.slice(0, 4).join(", ")} skills.`
          : "Related work may help you explore this opportunity.",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
