import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import {
  isFakeStudentId,
  loadConfig,
  saveConfig,
  writeProgressSnapshot,
  type DreamConfig,
} from '../lib/config';

export const initCommand = new Command('init')
  .description('初始化本地 .dream-agent（必须绑定网页 student id）')
  .option('-n, --name <name>', '学员姓名（与网页登录名一致更佳）')
  .option('-i, --id <id>', '网页设置页复制的 student id（必填，除非已有合法配置）')
  .option('-u, --url <url>', '后端地址', 'http://localhost:3000')
  .action(async (options) => {
    const spinner = ora('正在初始化...').start();
    const cwd = process.cwd();

    try {
      const existing = loadConfig(cwd);
      const id: string | undefined = options.id || existing?.id;
      const name: string = options.name || existing?.name || '未命名学员';
      const serverUrl: string = (options.url || existing?.serverUrl || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );

      if (!id || isFakeStudentId(id)) {
        spinner.fail(chalk.red('缺少合法的网页 student id'));
        console.log('');
        console.log(chalk.yellow('请按以下步骤操作：'));
        console.log('  1. 浏览器打开助教网页并登录');
        console.log('  2. 打开「设置」→「CLI / VS Code 对齐」→ 复制 Student ID');
        console.log('  3. 运行：');
        console.log(
          chalk.cyan(
            `     dream-agent init --id <粘贴的id> --name "${name === '未命名学员' ? '你的姓名' : name}"`
          )
        );
        console.log('');
        console.log(chalk.dim('禁止使用 learner_* 或 student_<时间戳> 等自造 id，否则与网页进度断开。'));
        process.exit(1);
      }

      const dirs = [
        '.dream-agent',
        'rustlings/exercises',
        'rcore/os',
        'rcore/lab1-batch',
        'rcore/lab2-address',
        'rcore/lab3-process',
        'rcore/lab4-filesystem',
        'rcore/lab5-concurrency',
        'submissions',
      ];

      for (const dir of dirs) {
        const dirPath = path.join(cwd, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(chalk.green(`  ✓ 创建目录: ${dir}`));
        }
      }

      // 尝试从服务器拉取阶段，保证与网页一致
      let currentStage = existing?.currentStage || 'pre_study_theory';
      let weakPoints: string[] = [];
      let totalQuestions = 0;
      let correctAnswers = 0;
      let resolvedName = name;

      try {
        const res = await fetch(`${serverUrl}/api/student?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.student) {
            currentStage = data.student.currentStage || currentStage;
            resolvedName = data.student.name || resolvedName;
            try {
              weakPoints = Array.isArray(data.student.weakPoints)
                ? data.student.weakPoints
                : JSON.parse(data.student.weakPoints || '[]');
            } catch {
              weakPoints = [];
            }
            totalQuestions = data.student.stats?.totalQuestions ?? 0;
            correctAnswers = data.student.stats?.correctAnswers ?? 0;
            console.log(chalk.green('  ✓ 已从服务器同步学员档案'));
          }
        } else if (res.status === 404) {
          spinner.warn(chalk.yellow('服务器未找到该 id，仍写入本地配置；请确认网页 id 是否复制完整'));
        }
      } catch {
        console.log(chalk.yellow('  ! 无法连接服务器，仅写入本地配置（请确认 --url 与 npm run dev）'));
      }

      const cfg: DreamConfig = {
        name: resolvedName,
        id,
        serverUrl,
        currentStage,
        feedbackMode: existing?.feedbackMode || 'hybrid',
      };
      saveConfig(cfg, cwd);
      console.log(chalk.green('  ✓ 写入 .dream-agent/config.yaml'));

      writeProgressSnapshot(
        {
          studentId: id,
          currentStage,
          weakPoints,
          totalQuestions,
          correctAnswers,
        },
        cwd
      );
      console.log(chalk.green('  ✓ 写入 .dream-agent/progress.json'));

      spinner.succeed(chalk.green('初始化完成（已绑定网页 student id）'));
      console.log('');
      console.log(chalk.cyan('绑定信息:'));
      console.log(`  姓名: ${cfg.name}`);
      console.log(`  ID:   ${cfg.id}`);
      console.log(`  服务: ${cfg.serverUrl}`);
      console.log(`  阶段: ${cfg.currentStage}`);
      console.log('');
      console.log(chalk.cyan('下一步:'));
      console.log('  $ dream-agent status');
      console.log('  $ dream-agent submit --lab lab1-batch -f path/to/main.rs');
      console.log('  $ dream-agent hint --topic "页表"');
    } catch (error) {
      spinner.fail(chalk.red('初始化失败'));
      console.error(error);
      process.exit(1);
    }
  });
