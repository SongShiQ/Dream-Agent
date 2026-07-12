import { describe, it, expect } from 'vitest';
import { buildRuleSummary } from '@/lib/db/chat';

describe('buildRuleSummary', () => {
  it('returns empty for no messages', () => {
    expect(buildRuleSummary([])).toBe('');
  });

  it('includes keywords and turns', () => {
    const s = buildRuleSummary([
      { role: 'user', content: '什么是进程和虚拟内存？' },
      { role: 'assistant', content: '进程是执行实例，虚拟内存提供地址抽象。' },
    ]);
    expect(s).toContain('话题线索');
    expect(s).toMatch(/进程|虚拟/);
    expect(s).toContain('学员');
    expect(s).toContain('助教');
  });
});
