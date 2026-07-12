import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const hintCommand = new Command('hint')
  .description('获取学习提示')
  .option('-t, --topic <topic>', '知识点主题')
  .option('-q, --question <question>', '具体问题')
  .option('-s, --student <id>', '学员 ID')
  .action(async (options) => {
    const spinner = ora('正在获取提示...').start();

    try {
      const studentId = options.student || 'default_student';
      
      // 构建提示请求
      let prompt = '';
      if (options.topic) {
        prompt = `请给我关于"${options.topic}"的学习提示和指导。`;
      } else if (options.question) {
        prompt = options.question;
      } else {
        prompt = '请给我一些学习操作系统的建议和提示。';
      }

      // 调用聊天 API
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          studentId,
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (!reader) {
          spinner.fail(chalk.red('无法读取响应'));
          return;
        }

        spinner.succeed(chalk.green('提示:'));
        console.log('');

        // 流式输出
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          // 解析 SSE 格式
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  process.stdout.write(parsed.choices[0].delta.content);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
        console.log('');
      } else {
        spinner.fail(chalk.red('获取提示失败'));
      }
    } catch (error) {
      spinner.fail(chalk.red('获取提示失败'));
      console.error(error);
    }
  });
