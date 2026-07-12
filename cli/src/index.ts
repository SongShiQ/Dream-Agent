#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { submitCommand } from './commands/submit';
import { statusCommand } from './commands/status';
import { hintCommand } from './commands/hint';

const program = new Command();

program
  .name('dream-agent')
  .description('OpenCamp AI 助教 CLI — 与网页共用 student id 与后端')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(submitCommand);
program.addCommand(statusCommand);
program.addCommand(hintCommand);

program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('身份对齐（必做）:'));
  console.log('  1. 网页登录 → 设置 → 复制 Student ID');
  console.log('  2. $ dream-agent init --id <id> --name <姓名>');
  console.log('  3. $ dream-agent status');
  console.log('');
  console.log(chalk.cyan('示例:'));
  console.log('  $ dream-agent init --id clxxxx --name 张三');
  console.log('  $ dream-agent status');
  console.log('  $ dream-agent submit --lab lab1-batch -f src/main.rs');
  console.log('  $ dream-agent hint --topic "页表"');
  console.log('');
  console.log(chalk.dim('概念题请在网页练习；CLI 侧重 lab 提交与提示。'));
});

program.parse();
