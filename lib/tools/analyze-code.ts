import { tool } from 'ai';
import { z } from 'zod';

export const analyzeCodeTool = tool({
  description: '分析 rCore/xv6 代码，解释函数、追踪调用链。当学员问代码相关问题时使用。',
  parameters: z.object({
    file_path: z.string().describe('源文件路径，如 kernel/trap.c'),
    function_name: z.string().optional().describe('指定函数名'),
    question: z.string().describe('学员的问题'),
  }),
  execute: async ({ file_path, function_name, question }) => {
    // TODO: 实际实现需要读取真实代码库
    // 这里返回模拟数据
    const mockCodeAnalysis: Record<string, string> = {
      'kernel/trap.c': `trap.c 是 xv6 处理中断和异常的核心文件。
主要函数：
- trap(): 处理所有中断和异常
- trapinit(): 初始化中断处理
- tvinit(): 设置中断向量表

trapframe 结构体保存了中断发生时的 CPU 状态，包括寄存器值。`,
      'kernel/vm.c': `vm.c 是 xv6 虚拟内存管理的核心文件。
主要函数：
- setupkvm(): 设置内核页表
- uvmcreate(): 创建用户页表
- mappages(): 建立页表映射
- walkpgdir(): 遍历页表

页表是多级结构，xv6 使用二级页表。`,
    };

    const analysis = mockCodeAnalysis[file_path] || `文件 ${file_path} 的代码分析：暂无详细信息。`;

    return {
      file: file_path,
      function: function_name,
      analysis: `${analysis}\n\n针对问题 "${question}"：请查看相关代码并理解其逻辑。`,
      suggestion: '建议阅读 rCore-Tutorial 相关章节以深入理解。',
    };
  },
});
