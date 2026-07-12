import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import {
  STAGE_LABELS,
  isFakeStudentId,
  loadConfig,
  parseWeakPoints,
  progressPath,
  writeProgressSnapshot,
} from '../lib/config';

export const statusCommand = new Command('status')
  .description('查看学习状态（优先服务器，与网页同一 student id）')
  .option('-s, --student <id>', '覆盖配置中的学员 ID')
  .option('-u, --url <url>', '覆盖服务器地址')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = loadConfig(cwd);

      const studentId = options.student || config?.id;
      const serverUrl = (options.url || config?.serverUrl || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );

      if (!studentId || isFakeStudentId(studentId)) {
        console.log(chalk.red('未绑定合法 student id。'));
        console.log(chalk.yellow('请先：网页登录 → 设置复制 ID → dream-agent init --id <id> --name <姓名>'));
        process.exit(1);
      }

      let serverStudent: {
        id: string;
        name: string;
        currentStage: string;
        weakPoints: string[];
        stats?: {
          totalQuestions?: number;
          correctAnswers?: number;
          recentAccuracy?: number;
          currentDifficulty?: number;
        };
        _count?: { answerRecords?: number; codeSubmissions?: number };
      } | null = null;

      try {
        const response = await fetch(`${serverUrl}/api/student?id=${encodeURIComponent(studentId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.student) {
            serverStudent = {
              id: data.student.id,
              name: data.student.name,
              currentStage: data.student.currentStage,
              weakPoints: parseWeakPoints(data.student.weakPoints),
              stats: data.student.stats,
              _count: data.student._count,
            };
            writeProgressSnapshot(
              {
                studentId: serverStudent.id,
                currentStage: serverStudent.currentStage,
                weakPoints: serverStudent.weakPoints,
                totalQuestions: serverStudent.stats?.totalQuestions ?? 0,
                correctAnswers: serverStudent.stats?.correctAnswers ?? 0,
              },
              cwd
            );
          }
        } else if (response.status === 404) {
          console.log(chalk.red(`服务器未找到学员 id=${studentId}`));
          console.log(chalk.yellow('请确认复制的是网页完整 id，且后端已启动。'));
        }
      } catch {
        console.log(chalk.yellow(`无法连接 ${serverUrl}，尝试本地 progress 缓存`));
      }

      let localProgress: {
        studentId?: string;
        currentStage?: string;
        weakPoints?: string[];
        totalQuestions?: number;
        correctAnswers?: number;
      } | null = null;
      const pp = progressPath(cwd);
      if (fs.existsSync(pp)) {
        try {
          localProgress = JSON.parse(fs.readFileSync(pp, 'utf-8'));
        } catch {
          localProgress = null;
        }
      }

      const name = serverStudent?.name || config?.name || '未知';
      const stage =
        serverStudent?.currentStage || localProgress?.currentStage || config?.currentStage || '—';
      const stageLabel = STAGE_LABELS[stage] || stage;
      const total =
        serverStudent?.stats?.totalQuestions ?? localProgress?.totalQuestions ?? 0;
      const correct =
        serverStudent?.stats?.correctAnswers ?? localProgress?.correctAnswers ?? 0;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const recentAcc = serverStudent?.stats?.recentAccuracy;
      const difficulty = serverStudent?.stats?.currentDifficulty;
      const weak =
        serverStudent?.weakPoints ||
        localProgress?.weakPoints ||
        [];

      console.log(chalk.cyan('=== 学习状态（与网页对齐）==='));
      console.log('');
      console.log(chalk.white(`学员: ${name}`));
      console.log(chalk.white(`ID:   ${studentId}`));
      console.log(chalk.white(`服务: ${serverUrl}`));
      console.log(
        chalk.white(
          `数据源: ${serverStudent ? '服务器' : localProgress ? '本地缓存' : '仅配置'}`
        )
      );
      console.log('');
      console.log(chalk.cyan('当前进度:'));
      console.log(`  阶段: ${stageLabel} (${stage})`);
      console.log(`  已答题: ${total}`);
      console.log(`  正确率: ${accuracy}%`);
      if (recentAcc !== undefined) {
        console.log(`  近 20 题正确率: ${Math.round(recentAcc * 100)}%`);
      }
      if (difficulty !== undefined) {
        console.log(`  当前难度: ${difficulty}`);
      }
      if (serverStudent?._count?.codeSubmissions !== undefined) {
        console.log(`  代码提交次数: ${serverStudent._count.codeSubmissions}`);
      }
      if (weak.length > 0) {
        console.log(`  薄弱点: ${weak.join(', ')}`);
      } else {
        console.log('  薄弱点: （无）');
      }

      console.log('');
      console.log(chalk.cyan('下一步:'));
      console.log('  $ dream-agent submit --lab lab1-batch -f <代码文件>');
      console.log('  $ dream-agent hint --topic "进程"');
      console.log('  网页继续练习/错题本，进度会反映到本命令');
    } catch (error) {
      console.error(chalk.red('获取状态失败'));
      console.error(error);
      process.exit(1);
    }
  });
