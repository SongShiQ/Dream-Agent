export interface DifficultyParams {
  currentDifficulty: number;  // 0-100
  recentAccuracy: number;     // 最近正确率
  consecutiveCorrect: number; // 连续正确数
  consecutiveWrong: number;   // 连续错误数
}

export function adjustDifficulty(params: DifficultyParams): number {
  const { currentDifficulty, recentAccuracy, consecutiveCorrect, consecutiveWrong } = params;

  let adjustment = 0;

  // 连续正确 3 题以上，提升难度
  if (consecutiveCorrect >= 3) {
    adjustment += 10;
  }

  // 连续错误 2 题以上，降低难度
  if (consecutiveWrong >= 2) {
    adjustment -= 15;
  }

  // 正确率高于 80%，提升难度
  if (recentAccuracy > 0.8) {
    adjustment += 5;
  }

  // 正确率低于 50%，降低难度
  if (recentAccuracy < 0.5) {
    adjustment -= 10;
  }

  // 限制在 0-100 范围
  return Math.max(0, Math.min(100, currentDifficulty + adjustment));
}

export function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 30) return '简单';
  if (difficulty < 60) return '中等';
  if (difficulty < 80) return '困难';
  return '专家';
}
