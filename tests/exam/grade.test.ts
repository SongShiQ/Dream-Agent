import { describe, it, expect } from 'vitest';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';

describe('gradeAnswer', () => {
  it('grades choice by letter', () => {
    expect(gradeAnswer('choice', 'A', 'A', ['A. x', 'B. y'])).toBe(true);
    expect(gradeAnswer('choice', 'A', 'B', ['A. x', 'B. y'])).toBe(false);
    expect(gradeAnswer('choice', 'A', 'a', [])).toBe(true);
  });

  it('grades fill with flexible separators', () => {
    expect(gradeAnswer('fill', '就绪、运行、阻塞', '就绪 运行 阻塞', [])).toBe(true);
    expect(gradeAnswer('fill', '就绪/运行', '运行', [])).toBe(true);
  });
});

describe('parseJsonArray', () => {
  it('parses json array string', () => {
    expect(parseJsonArray('["a","b"]')).toEqual(['a', 'b']);
    expect(parseJsonArray(null)).toEqual([]);
  });
});
