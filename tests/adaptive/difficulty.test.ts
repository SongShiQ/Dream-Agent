import { describe, it, expect } from 'vitest';
import { adjustDifficulty, getDifficultyLabel } from '@/lib/adaptive/difficulty';

describe('Difficulty Adjustment', () => {
  it('连续正确应该提升难度', () => {
    const result = adjustDifficulty({
      currentDifficulty: 50,
      recentAccuracy: 0.9,
      consecutiveCorrect: 4,
      consecutiveWrong: 0,
    });
    expect(result).toBeGreaterThan(50);
  });

  it('连续错误应该降低难度', () => {
    const result = adjustDifficulty({
      currentDifficulty: 50,
      recentAccuracy: 0.3,
      consecutiveCorrect: 0,
      consecutiveWrong: 3,
    });
    expect(result).toBeLessThan(50);
  });

  it('难度应该在 0-100 范围内', () => {
    const result = adjustDifficulty({
      currentDifficulty: 95,
      recentAccuracy: 0.95,
      consecutiveCorrect: 5,
      consecutiveWrong: 0,
    });
    expect(result).toBeLessThanOrEqual(100);
  });

  it('难度不能低于 0', () => {
    const result = adjustDifficulty({
      currentDifficulty: 5,
      recentAccuracy: 0.1,
      consecutiveCorrect: 0,
      consecutiveWrong: 5,
    });
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('表现一般时难度保持不变', () => {
    const result = adjustDifficulty({
      currentDifficulty: 50,
      recentAccuracy: 0.6,
      consecutiveCorrect: 1,
      consecutiveWrong: 0,
    });
    expect(result).toBe(50);
  });
});

describe('Difficulty Labels', () => {
  it('简单难度', () => {
    expect(getDifficultyLabel(20)).toBe('简单');
  });

  it('中等难度', () => {
    expect(getDifficultyLabel(50)).toBe('中等');
  });

  it('困难难度', () => {
    expect(getDifficultyLabel(70)).toBe('困难');
  });

  it('专家难度', () => {
    expect(getDifficultyLabel(90)).toBe('专家');
  });
});
