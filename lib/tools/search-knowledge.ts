import { tool } from 'ai';
import { z } from 'zod';

export const searchKnowledgeTool = tool({
  description: '检索 OS 教材、讲义、参考资料。当学员问理论问题时使用。',
  parameters: z.object({
    query: z.string().describe('检索关键词'),
    topic: z.enum(['process', 'memory', 'filesystem', 'interrupt', 'concurrency', 'rust', 'general']).optional(),
  }),
  execute: async ({ query, topic }) => {
    // TODO: 实际实现需要连接 pgvector
    // 这里返回模拟数据
    const mockResults: Record<string, string> = {
      process: '进程是操作系统中资源分配的基本单位。每个进程有自己的地址空间、文件描述符表等。进程状态包括：新建、就绪、运行、阻塞、终止。',
      memory: '虚拟内存是操作系统提供的一种内存管理技术。它使得每个进程认为自己拥有连续的、足够的内存空间。页表是实现虚拟内存的核心数据结构。',
      filesystem: '文件系统是操作系统中负责管理和存储文件的组件。常见的文件系统包括 ext4、NTFS、FAT32 等。inode 是 Unix 文件系统中存储文件元数据的数据结构。',
      interrupt: '中断是 CPU 响应外部事件的机制。中断分为硬件中断和软件中断。trap 是一种特殊的中断，用于实现系统调用。',
      concurrency: '并发是指多个任务在同一时间段内交替执行。实现并发的机制包括：进程、线程、协程。锁是实现同步的常用机制。',
      rust: 'Rust 是一种系统编程语言，以内存安全和并发安全著称。所有权系统是 Rust 的核心特性，它在编译时保证内存安全。',
      general: '操作系统是管理计算机硬件和软件资源的程序。主要功能包括：进程管理、内存管理、文件系统、设备管理。',
    };

    const content = mockResults[topic || 'general'] || mockResults.general;

    return {
      results: [
        {
          content: `关于 "${query}" 的知识：${content}`,
          source: 'rCore-Tutorial',
          relevance: 0.95,
        },
      ],
    };
  },
});
