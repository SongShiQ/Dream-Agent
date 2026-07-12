import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

export const initCommand = new Command('init')
  .description('初始化项目结构')
  .option('-n, --name <name>', '学员姓名')
  .option('-i, --id <id>', '学员 ID')
  .action(async (options) => {
    const spinner = ora('正在初始化项目...').start();

    try {
      // 获取当前目录
      const cwd = process.cwd();
      
      // 创建目录结构
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

      // 创建配置文件
      const configPath = path.join(cwd, '.dream-agent', 'config.yaml');
      if (!fs.existsSync(configPath)) {
        const config = `
# Dream Agent 配置
student:
  name: "${options.name || '未命名学员'}"
  id: "${options.id || `student_${Date.now()}`}"
  
server:
  url: "http://localhost:3000"
  
stage:
  current: "A1"
  
feedback:
  mode: "hybrid"
`;
        fs.writeFileSync(configPath, config.trim());
        console.log(chalk.green('  ✓ 创建配置文件: .dream-agent/config.yaml'));
      }

      // 创建进度文件
      const progressPath = path.join(cwd, '.dream-agent', 'progress.json');
      if (!fs.existsSync(progressPath)) {
        const progress = {
          studentId: options.id || `student_${Date.now()}`,
          currentStage: 'A1',
          completedLabs: [],
          weakPoints: [],
          totalQuestions: 0,
          correctAnswers: 0,
          lastUpdated: new Date().toISOString(),
        };
        fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
        console.log(chalk.green('  ✓ 创建进度文件: .dream-agent/progress.json'));
      }

      spinner.succeed(chalk.green('项目初始化完成！'));
      
      console.log('');
      console.log(chalk.cyan('下一步:'));
      console.log('  1. 编辑 .dream-agent/config.yaml 配置学员信息');
      console.log('  2. 运行 dream-agent status 查看状态');
      console.log('  3. 开始学习并使用 dream-agent submit 提交代码');
    } catch (error) {
      spinner.fail(chalk.red('初始化失败'));
      console.error(error);
      process.exit(1);
    }
  });
