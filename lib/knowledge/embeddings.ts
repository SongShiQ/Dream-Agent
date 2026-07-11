export async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: 实际实现需要调用 OpenAI embedding API
  // const { embed } = await import('ai');
  // const { openai } = await import('@ai-sdk/openai');
  // const { embedding } = await embed({
  //   model: openai.embedding('text-embedding-3-small'),
  //   value: text,
  // });
  // return embedding;

  // 返回模拟的 1536 维向量
  return new Array(1536).fill(0).map(() => Math.random());
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => generateEmbedding(text)));
}
