import { describe, it, expect } from 'vitest';
import { AGENT_SYSTEM_PROMPTS, AGENT_DESCRIPTIONS } from '@/lib/agents/config';
import type { AgentName } from '@/lib/agents/types';

describe('Agent Types', () => {
  it('应该有所有 Agent 的系统提示', () => {
    const agents: AgentName[] = ['assessor', 'tutor', 'examiner', 'planner'];
    
    for (const agent of agents) {
      expect(AGENT_SYSTEM_PROMPTS[agent]).toBeDefined();
      expect(AGENT_SYSTEM_PROMPTS[agent].length).toBeGreaterThan(0);
    }
  });

  it('应该有所有 Agent 的描述', () => {
    const agents: AgentName[] = ['assessor', 'tutor', 'examiner', 'planner'];
    
    for (const agent of agents) {
      expect(AGENT_DESCRIPTIONS[agent]).toBeDefined();
      expect(AGENT_DESCRIPTIONS[agent].length).toBeGreaterThan(0);
    }
  });

  it('系统提示应该用中文', () => {
    for (const [agent, prompt] of Object.entries(AGENT_SYSTEM_PROMPTS)) {
      // 检查是否包含中文字符
      const hasChinese = /[\u4e00-\u9fa5]/.test(prompt);
      expect(hasChinese).toBe(true);
    }
  });
});
