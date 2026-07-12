'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// LLM 提供商配置
const LLM_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'custom', name: '自定义', models: [] },
];

// 反馈模式
const FEEDBACK_MODES = [
  { id: 'guided', name: '引导式', description: '引导学员自己发现答案' },
  { id: 'direct', name: '直接式', description: '直接给出答案和解释' },
  { id: 'hybrid', name: '混合式', description: '先引导，再给答案（推荐）' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [provider, setProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [feedbackMode, setFeedbackMode] = useState('hybrid');
  const [baseUrl, setBaseUrl] = useState('');

  const selectedProvider = LLM_PROVIDERS.find(p => p.id === provider);

  const handleSave = () => {
    // 保存配置到 localStorage
    const config = {
      provider,
      apiKey,
      model,
      feedbackMode,
      baseUrl: provider === 'custom' ? baseUrl : undefined,
    };
    localStorage.setItem('llm-config', JSON.stringify(config));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>设置</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LLM 配置 */}
          <div>
            <h3 className="text-sm font-medium mb-3">LLM 配置</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">提供商</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                >
                  {LLM_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入 API Key..."
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
                    {selectedProvider.models.map(m => (
                      <option key={m} value={m}>{m}</option>
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

          {/* 反馈模式 */}
          <div>
            <h3 className="text-sm font-medium mb-3">反馈模式</h3>
            <div className="space-y-2">
              {FEEDBACK_MODES.map(mode => (
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

          {/* 保存按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
