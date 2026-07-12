import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { isFakeStudentId, loadConfig } from '../lib/config';

export const submitCommand = new Command('submit')
  .description('提交 lab 代码到网页同一后端（静态分析反馈）')
  .option('-l, --lab <lab>', '实验室名称', 'lab1-batch')
  .option('-f, --file <file>', '代码文件路径')
  .option('-s, --student <id>', '覆盖配置中的学员 ID')
  .option('-u, --url <url>', '覆盖服务器地址')
  .action(async (options) => {
    const spinner = ora('正在提交代码...').start();

    try {
      const cwd = process.cwd();
      const config = loadConfig(cwd);

      const studentId = options.student || config?.id;
      const serverUrl = (options.url || config?.serverUrl || 'http://localhost:3000').replace(
        /\/$/,
        ''
      );

      if (!studentId || isFakeStudentId(studentId)) {
        spinner.fail(chalk.red('未绑定合法 student id'));
        console.log(chalk.yellow('请先: dream-agent init --id <网页id> --name <姓名>'));
        process.exit(1);
      }

      let code = '';
      if (options.file) {
        const filePath = path.resolve(options.file);
        if (!fs.existsSync(filePath)) {
          spinner.fail(chalk.red(`文件不存在: ${options.file}`));
          process.exit(1);
        }
        code = fs.readFileSync(filePath, 'utf-8');
      } else {
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
        spinner.fail(chalk.red('未找到代码文件，请用 -f 指定'));
        process.exit(1);
      }

      const response = await fetch(`${serverUrl}/api/submit`, {
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
        console.log(`  学员: ${studentId}`);
        console.log(`  实验室: ${options.lab}`);
        console.log(`  代码长度: ${code.length} 字符`);
        console.log(`  提交时间: ${new Date().toLocaleString()}`);

        if (result.feedback) {
          console.log('');
          console.log(chalk.yellow('反馈:'));
          console.log(
            typeof result.feedback === 'string'
              ? result.feedback
              : JSON.stringify(result.feedback, null, 2)
          );
        }
      } else {
        spinner.fail(chalk.red(`提交失败: ${result.error || response.status}`));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('提交失败（请确认后端已启动）'));
      console.error(error);
      process.exit(1);
    }
  });
