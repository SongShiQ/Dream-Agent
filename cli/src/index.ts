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
  .description('OpenCamp AI 助教 CLI 工具')
  .version('0.1.0');

// 注册命令
program.addCommand(initCommand);
program.addCommand(submitCommand);
program.addCommand(statusCommand);
program.addCommand(hintCommand);

// 显示帮助
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('示例:'));
  console.log('  $ dream-agent init');
  console.log('  $ dream-agent submit --lab lab1');
  console.log('  $ dream-agent status');
  console.log('  $ dream-agent hint --topic "进程管理"');
});

program.parse();
