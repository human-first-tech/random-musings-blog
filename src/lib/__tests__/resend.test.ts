jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({})) }));
import { generateUnsubToken, verifyUnsubToken } from '../resend';

describe('unsubscribe token', () => {
  const orig = process.env;
  beforeEach(() => { process.env = { ...orig, REVALIDATE_SECRET: 'test-secret' }; });
  afterEach(() => { process.env = orig; });

  it('generates a consistent token for the same email', () => {
    expect(generateUnsubToken('a@b.com')).toBe(generateUnsubToken('a@b.com'));
  });
  it('generates different tokens for different emails', () => {
    expect(generateUnsubToken('a@b.com')).not.toBe(generateUnsubToken('c@d.com'));
  });
  it('verifies a valid token', () => {
    expect(verifyUnsubToken('a@b.com', generateUnsubToken('a@b.com'))).toBe(true);
  });
  it('rejects an invalid token', () => {
    expect(verifyUnsubToken('a@b.com', 'bad')).toBe(false);
  });
});
