import { describe, expect, it } from 'vitest';
import { rankMatches, scoreMatch } from '../src/services/matching.js';
import { SkillGapGuideSchema } from '../src/services/ai/schemas.js';

describe('opportunity matching', () => {
  it('ranks shared skills and gives a short reason', () => {
    expect(scoreMatch(['React', 'TypeScript', 'Product design'], ['react', 'SQL'])).toEqual({ score: 50, matches: ['react'] });
    const ranked = rankMatches([{ title: 'Frontend role', tags: ['React', 'CSS'] }, { title: 'Data role', tags: ['SQL', 'Python'] }], ['React', 'CSS']);
    expect(ranked[0].title).toBe('Frontend role');
    expect(ranked[0].whyMatched).toContain('react');
  });

  it('validates the complete skill-gap response shape', () => {
    const value = { weakCriteria: [{ id: 'reasoning_under_questioning', name: 'Reasoning', gap: 'The assumptions were not compared against the observed pattern.', howToImprove: 'Write down one alternate explanation and the evidence that would distinguish it.' }], learningPath: [1, 2, 3].map((number) => ({ title: `Practice ${number}`, why: 'Build a repeatable way to check the conclusion.', estHours: 2, resourceHint: 'Try a small public dataset.' })), retryAdvice: 'Explain one alternative and name the evidence that would change your recommendation.' };
    expect(SkillGapGuideSchema.safeParse(value).success).toBe(true);
  });
});
