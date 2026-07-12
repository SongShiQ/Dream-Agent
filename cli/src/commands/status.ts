import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export const statusCommand = new Command('status')
  .description('查看学习状态')
  .option('-s, --student <id>', '学员 ID')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      
      // 读取本地进度
      const progressPath = path.join(cwd, '.dream-agent', 'progress.json');
      let localProgress = null;
      if (fs.existsSync(progressPath)) {
        localProgress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
      }

      // 读取配置
      const configPath = path.join(cwd, '.dream-agent', 'config.yaml');
      let config = null;
      if (fs.existsSync(configPath)) {
        // 简单解析 YAML
        const content = fs.readFileSync(configPath, 'utf-8');
        const nameMatch = content.match(/name:\s*"([^"]+)"/);
        const idMatch = content.match(/id:\s*"([^"]+)"/);
        config = {
          name: nameMatch ? nameMatch[1] : '未命名学员',
          id: idMatch ? idMatch[1] : 'unknown',
        };
      }

      // 尝试从服务器获取最新状态
      let serverProgress = null;
      try {
        const studentId = options.student || config?.id || 'default_student';
        const response = await fetch(`http://localhost:3000/api/student?id=${studentId}`);
        if (response.ok) {
          const data = await response.json();
          serverProgress = data.student;
        }
      } catch (e) {
        // 服务器不可用，使用本地数据
      }

      // 显示状态
      console.log(chalk.cyan('=== 学习状态 ==='));
      console.log('');
      
      if (config) {
        console.log(chalk.white(`学员: ${config.name}`));
        console.log(chalk.white(`ID: ${config.id}`));
      }

      console.log('');
      console.log(chalk.cyan('当前进度:'));
      
      const progress = serverProgress || localProgress;
      if (progress) {
        const stage = progress.currentStage || 'A1';
        const stageLabels: Record<string, string> = {
          'A1': '导学-零基础',
          'A2': '导学-有编程经验',
          'A3': '导学-有其他语言基础',
          'B1': '基础-Rust 入门',
          'B2': '基础-Rust 进阶',
          'B3': '基础-工具使用',
          'C1': '专业-批处理',
          'C2': '专业-地址空间',
          'C3': '专业-进程',
          'C4': '专业-文件系统',
          'C5': '专业-并发',
          'D1': '项目-组件化 OS',
          'D2': '项目-项目实践',
        };
        
        console.log(`  阶段: ${stageLabels[stage] || stage}`);
        
        if (progress.totalQuestions) {
          const accuracy = progress.correctAnswers 
            ? Math.round(progress.correctAnswers / progress.totalQuestions * 100) 
            : 0;
          console.log(`  已答题: ${progress.totalQuestions}`);
          console.log(`  正确率: ${accuracy}%`);
        }
        
        if (progress.weakPoints && progress.weakPoints.length > 0) {
          console.log(`  薄弱点: ${progress.weakPoints.join(', ')}`);
        }
      } else {
        console.log(chalk.yellow('  暂无进度数据'));
        console.log(chalk.cyan('  请先运行 dream-agent init 初始化'));
      }

      console.log('');
      console.log(chalk.cyan('下一步:'));
      console.log('  $ dream-agent submit --lab lab1');
      console.log('  $ dream-agent hint --topic "进程管理"');
    } catch (error) {
      console.error(chalk.red('获取状态失败'));
      console.error(error);
    }
  });
