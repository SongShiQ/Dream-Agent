import prisma from '../db/index';

export async function indexKnowledge(
  content: string,
  source: string,
  topic: string
) {
  // TODO: 实际实现需要使用 pgvector
  // const embedding = await generateEmbedding(content);
  // await prisma.$executeRaw`
  //   INSERT INTO "Knowledge" (content, source, topic, embedding)
  //   VALUES (${content}, ${source}, ${topic}, ${embedding}::vector)
  // `;

  console.log(`[Knowledge] Indexed: ${source} (${topic})`);
}

export async function searchKnowledge(
  query: string,
  topic?: string,
  limit: number = 5
) {
  // TODO: 实际实现需要使用 pgvector 进行相似度搜索
  // const embedding = await generateEmbedding(query);
  // const results = await prisma.$queryRaw`
  //   SELECT content, source, topic,
  //          1 - (embedding <=> ${embedding}::vector) as relevance
  //   FROM "Knowledge"
  //   WHERE ${topic}::text IS NULL OR topic = ${topic}
  //   ORDER BY embedding <=> ${embedding}::vector
  //   LIMIT ${limit}
  // `;

  // 返回模拟数据
  return [
    {
      content: `关于 "${query}" 的知识：操作系统是管理计算机硬件和软件资源的程序。`,
      source: 'rCore-Tutorial',
      topic: topic || 'general',
      relevance: 0.95,
    },
  ];
}
