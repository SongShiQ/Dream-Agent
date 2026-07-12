'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/lib/context/app-context';

const LLM_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'custom', name: '自定义', models: [] },
];

const FEEDBACK_MODES = [
  { id: 'guided', name: '引导式', description: '引导学员自己发现答案' },
  { id: 'direct', name: '直接式', description: '直接给出答案和解释' },
  { id: 'hybrid', name: '混合式', description: '先引导，再给答案（推荐）' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user } = useApp();
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [feedbackMode, setFeedbackMode] = useState('hybrid');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const serverUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const cliInitCmd = useMemo(() => {
    if (!user?.studentId) return '';
    const name = (user.name || '学员').replace(/"/g, '\\"');
    return `dream-agent init --id ${user.studentId} --name "${name}" --url ${serverUrl}`;
  }, [user?.studentId, user?.name, serverUrl]);

  const cliConfigYaml = useMemo(() => {
    if (!user?.studentId) return '';
    const name = (user.name || '学员').replace(/"/g, '\\"');
    const stage = user.currentStage || 'pre_study_theory';
    return `# Dream Agent 配置 — 与网页学员档案对齐
student:
  name: "${name}"
  id: "${user.studentId}"

server:
  url: "${serverUrl}"

stage:
  current: "${stage}"

feedback:
  mode: "hybrid"
`;
  }, [user?.studentId, user?.name, user?.currentStage, serverUrl]);

  async function copyText(text: string, okMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(okMsg);
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint('复制失败，请手动选择文本');
      setTimeout(() => setCopyHint(null), 2500);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('llm-config');
      if (raw) {
        const c = JSON.parse(raw);
        if (c.provider) setProvider(c.provider);
        if (c.apiKey) setApiKey(c.apiKey);
        if (c.model) setModel(c.model);
        if (c.feedbackMode) setFeedbackMode(c.feedbackMode);
        if (c.baseUrl) setBaseUrl(c.baseUrl);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const config = {
      provider,
      apiKey,
      model,
      feedbackMode,
      baseUrl: provider === 'custom' ? baseUrl : undefined,
    };
    localStorage.setItem('llm-config', JSON.stringify(config));

    // 同步反馈模式到服务端学员档案
    if (user?.studentId) {
      try {
        await fetch('/api/student', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.studentId,
            feedbackMode,
          }),
        });
      } catch {
        /* 本地已保存即可 */
      }
    }

    setMsg('已保存');
    setSaving(false);
    setTimeout(() => onClose(), 400);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>设置</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">CLI / VS Code 对齐</h3>
            <p className="text-xs text-muted-foreground mb-3">
              概念题在网页练；lab 在 VS Code 写。CLI 必须使用下方同一 Student
              ID，进度与网页才一致（勿自造 learner_/student_ 假 id）。
            </p>
            {user?.studentId ? (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <div>
                  <label className="text-xs text-muted-foreground">姓名</label>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Student ID（完整）</label>
                  <div className="mt-1 flex gap-2 items-start">
                    <code className="flex-1 text-xs break-all p-2 bg-background border rounded">
                      {user.studentId}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => copyText(user.studentId, '已复制 Student ID')}
                    >
                      复制 ID
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">一键初始化命令</label>
                  <div className="mt-1 flex gap-2 items-start">
                    <code className="flex-1 text-xs break-all p-2 bg-background border rounded">
                      {cliInitCmd}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => copyText(cliInitCmd, '已复制 init 命令')}
                    >
                      复制命令
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">config.yaml 全文</label>
                  <pre className="mt-1 text-xs p-2 bg-background border rounded overflow-x-auto whitespace-pre-wrap">
                    {cliConfigYaml}
                  </pre>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => copyText(cliConfigYaml, '已复制 config.yaml')}
                  >
                    复制 YAML
                  </Button>
                </div>
                <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                  <li>
                    在 lab 仓库目录：<code className="text-[11px]">cd Dream Agent/cli && npm i && npx tsx src/index.ts init ...</code>
                    （或全局装好 dream-agent 后用上面命令）
                  </li>
                  <li>
                    运行 <code className="text-[11px]">dream-agent status</code>，应看到与网页相同的答题/薄弱点
                  </li>
                  <li>
                    提交代码：
                    <code className="text-[11px]">dream-agent submit --lab lab1-batch -f path/to/main.rs</code>
                  </li>
                </ol>
                {copyHint && <p className="text-xs text-green-700">{copyHint}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">登录后显示可复制的 Student ID。</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">LLM 配置（本地缓存）</h3>
            <p className="text-xs text-muted-foreground mb-2">
              填写的 API Key 会随聊天请求发送到服务端（优先于 .env）。反馈模式同步到学员档案。练习/摸底/计划模板仍可不依赖 Key。
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">提供商</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                >
                  {LLM_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">API Key（仅存浏览器）</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="可选，预留"
                  className="mt-1"
                />
              </div>

              {selectedProvider && selectedProvider.models.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">模型</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 border rounded mt-1"
                  >
                    {selectedProvider.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {provider === 'custom' && (
                <div>
                  <label className="text-sm text-muted-foreground">Base URL</label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">反馈模式</h3>
            <div className="space-y-2">
              {FEEDBACK_MODES.map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-colors ${
                    feedbackMode === mode.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="feedbackMode"
                    value={mode.id}
                    checked={feedbackMode === mode.id}
                    onChange={(e) => setFeedbackMode(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium">{mode.name}</div>
                    <div className="text-xs text-muted-foreground">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {msg && <p className="text-sm text-green-700">{msg}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
