import { sanitizeCommentInput } from '../notion-comments';

describe('sanitizeCommentInput', () => {
  it('strips HTML tags', () => {
    expect(sanitizeCommentInput('<b>hello</b>')).toBe('hello');
  });
  it('trims whitespace', () => {
    expect(sanitizeCommentInput('  hi  ')).toBe('hi');
  });
  it('truncates to maxLen', () => {
    expect(sanitizeCommentInput('a'.repeat(200), 100)).toHaveLength(100);
  });
  it('passes clean input unchanged', () => {
    expect(sanitizeCommentInput('Hello world')).toBe('Hello world');
  });
  it('collapses internal whitespace', () => {
    expect(sanitizeCommentInput('hello  <b>  </b>  world')).toBe('hello world');
  });
});
