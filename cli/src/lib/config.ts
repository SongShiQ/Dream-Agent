import * as fs from 'fs';
import * as path from 'path';

export type DreamConfig = {
  name: string;
  id: string;
  serverUrl: string;
  currentStage: string;
  feedbackMode: string;
};

const DEFAULT_SERVER = 'http://localhost:3000';

/** 与网页 lib/adaptive/stage.ts 对齐的阶段标签 */
export const STAGE_LABELS: Record<string, string> = {
  pre_study_theory: '导学-理论',
  pre_study_rust: '导学-Rust',
  pre_study_tools: '导学-工具',
  basic: '基础阶段',
  professional: '专业阶段',
  project_intro: '项目先导',
  project: '项目阶段',
};

export function agentDir(cwd = process.cwd()): string {
  return path.join(cwd, '.dream-agent');
}

export function configPath(cwd = process.cwd()): string {
  return path.join(agentDir(cwd), 'config.yaml');
}

export function progressPath(cwd = process.cwd()): string {
  return path.join(agentDir(cwd), 'progress.json');
}

/** 极简 YAML 读写（仅本项目扁平键） */
export function parseConfigYaml(content: string): Partial<DreamConfig> {
  const get = (key: string): string | undefined => {
    const re = new RegExp(`${key}:\\s*"([^"]*)"`, 'm');
    const m = content.match(re);
    return m?.[1];
  };
  const getUnquoted = (key: string): string | undefined => {
    const re = new RegExp(`${key}:\\s*([^\\n#]+)`, 'm');
    const m = content.match(re);
    return m?.[1]?.trim().replace(/^["']|["']$/g, '');
  };
  return {
    name: get('name') || getUnquoted('name'),
    id: get('id') || getUnquoted('id'),
    serverUrl: get('url') || getUnquoted('url') || DEFAULT_SERVER,
    currentStage: get('current') || getUnquoted('current') || 'pre_study_theory',
    feedbackMode: get('mode') || getUnquoted('mode') || 'hybrid',
  };
}

export function serializeConfig(cfg: DreamConfig): string {
  return `# Dream Agent 配置 — 与网页学员档案对齐
# student.id 必须是网页登录后 Prisma 生成的 id（设置页可复制），禁止自造 learner_/student_ 前缀假 id
student:
  name: "${cfg.name}"
  id: "${cfg.id}"

server:
  url: "${cfg.serverUrl}"

stage:
  current: "${cfg.currentStage}"

feedback:
  mode: "${cfg.feedbackMode}"
`;
}

export function loadConfig(cwd = process.cwd()): DreamConfig | null {
  const p = configPath(cwd);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf-8');
  const parsed = parseConfigYaml(raw);
  if (!parsed.id || isFakeStudentId(parsed.id)) {
    return null;
  }
  return {
    name: parsed.name || '未命名学员',
    id: parsed.id,
    serverUrl: (parsed.serverUrl || DEFAULT_SERVER).replace(/\/$/, ''),
    currentStage: parsed.currentStage || 'pre_study_theory',
    feedbackMode: parsed.feedbackMode || 'hybrid',
  };
}

/** 假 id：历史 learner_* / 本地乱造的 student_<timestamp> */
export function isFakeStudentId(id: string): boolean {
  if (!id || id === 'default_student' || id === 'unknown') return true;
  if (id.startsWith('learner_')) return true;
  if (/^student_\d{10,}$/.test(id)) return true;
  return false;
}

export function ensureAgentDir(cwd = process.cwd()): void {
  const d = agentDir(cwd);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

export function saveConfig(cfg: DreamConfig, cwd = process.cwd()): void {
  ensureAgentDir(cwd);
  fs.writeFileSync(configPath(cwd), serializeConfig(cfg), 'utf-8');
}

export function writeProgressSnapshot(
  data: {
    studentId: string;
    currentStage: string;
    weakPoints: string[];
    totalQuestions: number;
    correctAnswers: number;
  },
  cwd = process.cwd()
): void {
  ensureAgentDir(cwd);
  fs.writeFileSync(
    progressPath(cwd),
    JSON.stringify(
      {
        ...data,
        lastUpdated: new Date().toISOString(),
        source: 'server',
      },
      null,
      2
    ),
    'utf-8'
  );
}

export function parseWeakPoints(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}
