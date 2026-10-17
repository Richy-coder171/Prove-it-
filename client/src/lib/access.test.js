import { describe, expect, it } from 'vitest';
import { hasAllowedRole } from './access.js';

describe('role access', () => {
  it('allows any authenticated role when no role list is supplied', () => {
    expect(hasAllowedRole({ role: 'candidate' }, undefined)).toBe(true);
  });

  it('allows a listed role and rejects an unlisted role', () => {
    expect(hasAllowedRole({ role: 'startup' }, ['startup', 'mentor'])).toBe(true);
    expect(hasAllowedRole({ role: 'candidate' }, ['startup', 'mentor'])).toBe(false);
  });
});
