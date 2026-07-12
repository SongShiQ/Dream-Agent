import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';

export const submitCommand = new Command('submit')
  .description('提交代码')
  .option('-l, --lab <lab>', '实验室名称', 'lab1')
  .option('-f, --file <file>', '代码文件路径')
  .option('-s, --student <id>', '学员 ID')
  .action(async (options) => {
    const spinner = ora('正在提交代码...').start();

    try {
      const cwd = process.cwd();
      
      // 读取配置
      const configPath = path.join(cwd, '.dream-agent', 'config.yaml');
      if (!fs.existsSync(configPath)) {
        spinner.fail(chalk.red('未找到配置文件，请先运行 dream-agent init'));
        process.exit(1);
      }

      // 读取代码文件
      let code = '';
      if (options.file) {
        const filePath = path.resolve(options.file);
        if (!fs.existsSync(filePath)) {
          spinner.fail(chalk.red(`文件不存在: ${options.file}`));
          process.exit(1);
        }
        code = fs.readFileSync(filePath, 'utf-8');
      } else {
        // 默认读取 main.rs 或 lib.rs
        const defaultFiles = ['src/main.rs', 'src/lib.rs', 'main.rs'];
        for (const file of defaultFiles) {
          const filePath = path.join(cwd, file);
          if (fs.existsSync(filePath)) {
            code = fs.readFileSync(filePath, 'utf-8');
            break;
          }
        }
      }

      if (!code) {
        spinner.fail(chalk.red('未找到代码文件'));
        process.exit(1);
      }

      // 读取学员 ID
      const studentId = options.student || 'default_student';

      // 调用 API 提交
      const response = await fetch('http://localhost:3000/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          labName: options.lab,
          code,
          language: 'rust',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        spinner.succeed(chalk.green('代码提交成功！'));
        console.log('');
        console.log(chalk.cyan('提交信息:'));
        console.log(`  实验室: ${options.lab}`);
        console.log(`  代码长度: ${code.length} 字符`);
        console.log(`  提交时间: ${new Date().toLocaleString()}`);
        
        if (result.feedback) {
          console.log('');
          console.log(chalk.yellow('AI 反馈:'));
          console.log(result.feedback);
        }
      } else {
        spinner.fail(chalk.red(`提交失败: ${result.error}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('提交失败'));
      console.error(error);
      process.exit(1);
    }
  });
