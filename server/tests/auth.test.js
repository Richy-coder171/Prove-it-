import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/models/User.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

const [{ default: app }, { default: User }] = await Promise.all([
  import('../src/app.js'),
  import('../src/models/User.js'),
]);

describe('authentication routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers a user and sets an httpOnly session cookie', async () => {
    User.create.mockResolvedValue({ id: 'candidate-1', email: 'person@example.com', fullName: 'A Person', role: 'candidate' });

    const response = await request(app).post('/api/auth/register').send({
      email: 'PERSON@example.com', password: 'correct-horse-battery', fullName: 'A Person', role: 'candidate',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({ email: 'person@example.com', role: 'candidate' });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects weak passwords before reaching the user store', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'person@example.com', password: 'short', fullName: 'A Person', role: 'candidate',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects incorrect login credentials', async () => {
    User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const response = await request(app).post('/api/auth/login').send({ email: 'person@example.com', password: 'not-it' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the authenticated user and rejects missing sessions', async () => {
    User.findById.mockResolvedValue({ id: 'candidate-1', email: 'person@example.com', fullName: 'A Person', role: 'candidate' });
    User.create.mockResolvedValue({ id: 'candidate-1', email: 'person@example.com', fullName: 'A Person', role: 'candidate' });

    const registered = await request(app).get('/api/auth/me');
    expect(registered.status).toBe(401);

    const loggedIn = await request(app).post('/api/auth/register').send({
      email: 'person@example.com', password: 'correct-horse-battery', fullName: 'A Person', role: 'candidate',
    });

    const me = await request(app).get('/api/auth/me').set('Cookie', loggedIn.headers['set-cookie']);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe('candidate-1');
  });
});
