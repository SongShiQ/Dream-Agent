import { describe, it, expect } from 'vitest';
import { normalizeGeneratedQuestion } from '@/lib/agents/examiner';

describe('normalizeGeneratedQuestion', () => {
  it('forces A-D prefixes and single-letter answer', () => {
    const q = normalizeGeneratedQuestion({
      type: 'choice',
      content: '什么是页表？',
      options: ['映射虚实地址', '存文件名', '调度队列', '网卡驱动'],
      answer: '映射虚实地址',
      explanation: '页表做 VA→PA',
      knowledgePoints: ['virtual_memory'],
      difficulty: 40,
    });
    expect(q.options).toHaveLength(4);
    expect(q.options[0].startsWith('A.')).toBe(true);
    expect(q.options[1].startsWith('B.')).toBe(true);
    expect(q.answer).toBe('A');
  });

  it('keeps letter answer', () => {
    const q = normalizeGeneratedQuestion({
      type: 'choice',
      content: 'fork 子进程返回？',
      options: ['A. 0', 'B. 父 PID', 'C. -1 总是', 'D. 随机'],
      answer: 'A',
      explanation: '子返回 0',
      knowledgePoints: ['fork'],
      difficulty: 45,
    });
    expect(q.answer).toBe('A');
    expect(q.options[0]).toMatch(/^A\./);
  });
});
