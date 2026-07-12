import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { isFakeStudentId, loadConfig } from '../lib/config';

export const hintCommand = new Command('hint')
  .description('获取学习提示（调用与网页相同的 /api/chat）')
  .option('-t, --topic <topic>', '知识点主题')
  .option('-q, --question <question>', '具体问题')
  .option('-s, --student <id>', '覆盖配置中的学员 ID')
  .option('-u, --url <url>', '覆盖服务器地址')
  .action(async (options) => {
    const spinner = ora('正在获取提示...').start();

    try {
      const config = loadConfig();
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

      let prompt = '';
      if (options.topic) {
        prompt = `请给我关于「${options.topic}」的简短学习提示（结合 OpenCamp / rCore，先引导再给要点）。`;
      } else if (options.question) {
        prompt = options.question;
      } else {
        prompt = '请根据操作系统训练营，给我 3 条可执行的今日学习建议。';
      }

      const response = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          studentId,
        }),
      });

      if (!response.ok) {
        spinner.fail(chalk.red(`获取提示失败: HTTP ${response.status}`));
        const text = await response.text().catch(() => '');
        if (text) console.error(text.slice(0, 400));
        process.exit(1);
      }

      spinner.succeed(chalk.green('提示:'));
      console.log('');

      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        console.log(text);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 兼容 SSE data: 行与纯文本流
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            try {
              const parsed = JSON.parse(data);
              const piece =
                parsed.choices?.[0]?.delta?.content ||
                parsed.choices?.[0]?.message?.content ||
                parsed.content ||
                parsed.delta ||
                '';
              if (piece) process.stdout.write(piece);
            } catch {
              process.stdout.write(data);
            }
          } else {
            // 非 SSE：直接输出（部分 AI SDK 流）
            try {
              const parsed = JSON.parse(trimmed);
              const piece = parsed.type === 'text-delta' ? parsed.textDelta : '';
              if (piece) process.stdout.write(piece);
            } catch {
              process.stdout.write(trimmed);
            }
          }
        }
      }
      if (buffer.trim()) {
        process.stdout.write(buffer);
      }
      console.log('');
    } catch (error) {
      spinner.fail(chalk.red('获取提示失败'));
      console.error(error);
      process.exit(1);
    }
  });
