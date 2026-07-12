'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { ExamPanel } from '@/components/ExamPanel';
import { ProgressPanel } from '@/components/ProgressPanel';
import { useApp } from '@/lib/context/app-context';
import { useState, useCallback } from 'react';

// 学习模式配置
const LEARNING_MODES = {
  chat: {
    icon: '💬',
    label: '智能问答',
    description: '随时提问，获得解答',
    placeholder: '输入你的问题...',
  },
  quiz: {
    icon: '📝',
    label: '练习模式',
    description: '做题练习，巩固知识',
    placeholder: '输入你想练习的知识点...',
  },
  assess: {
    icon: '📊',
    label: '水平评估',
    description: '测试你的知识水平',
    placeholder: '输入你想评估的领域...',
  },
  plan: {
    icon: '📋',
    label: '学习计划',
    description: '制定个性化学习路径',
    placeholder: '输入你的学习目标...',
  },
  practice: {
    icon: '🎯',
    label: '专项训练',
    description: '针对薄弱点强化训练',
    placeholder: '输入你想训练的知识点...',
  },
};

type ModeKey = keyof typeof LEARNING_MODES;

export default function Home() {
  const { user, isLoggedIn, login, logout, currentMode, setMode } = useApp();
  const [showLogin, setShowLogin] = useState(!isLoggedIn);
  const [showModeSwitch, setShowModeSwitch] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModeKey | null>(null);

  const handleLogin = (name: string) => {
    login(name);
    setShowLogin(false);
  };

  const handleModeChange = useCallback((mode: ModeKey) => {
    if (mode === currentMode) return;
    setPendingMode(mode);
    setShowModeSwitch(true);
  }, [currentMode]);

  const confirmModeSwitch = useCallback(() => {
    if (pendingMode) {
      setMode(pendingMode);
      setShowModeSwitch(false);
      setPendingMode(null);
    }
  }, [pendingMode, setMode]);

  const cancelModeSwitch = useCallback(() => {
    setShowModeSwitch(false);
    setPendingMode(null);
  }, []);

  // 登录界面
  if (showLogin || !isLoggedIn) {
    return (
      <main className="flex h-screen bg-background items-center justify-center">
        <div className="w-96 p-8 border rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2">OpenCamp AI 助教</h1>
          <p className="text-muted-foreground mb-6">
            基于多 Agent 架构的智能学习助手
          </p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get('name') as string;
            if (name.trim()) {
              handleLogin(name.trim());
            }
          }}>
            <input
              name="name"
              type="text"
              placeholder="输入你的名字开始学习..."
              className="w-full p-3 border rounded-lg mb-4 bg-background"
              required
              autoFocus
            />
            <button
              type="submit"
              className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              开始学习
            </button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <p className="mb-2">支持的学习模式：</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LEARNING_MODES).map(([key, mode]) => (
                <div key={key} className="flex items-center gap-1">
                  <span>{mode.icon}</span>
                  <span>{mode.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 渲染当前模式的内容
  const renderContent = () => {
    switch (currentMode) {
      case 'quiz':
        return <ExamPanel studentId={user?.studentId || ''} />;
      case 'plan':
        return <ProgressPanel studentId={user?.studentId || ''} />;
      default:
        return (
          <ChatPanel 
            mode={currentMode} 
            placeholder={LEARNING_MODES[currentMode].placeholder}
          />
        );
    }
  };

  // 主界面
  return (
    <main className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="border-b p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
              <p className="text-sm text-muted-foreground">
                欢迎，{user?.name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                退出
              </button>
            </div>
          </div>

          {/* 学习模式切换 */}
          <div className="flex gap-2">
            {Object.entries(LEARNING_MODES).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => handleModeChange(key as ModeKey)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  currentMode === key
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* 主内容区 */}
        <div className="flex-1 flex">
          <div className="flex-1">
            {renderContent()}
          </div>

          {/* 右侧边栏 */}
          <aside className="w-80 border-l p-4 hidden lg:block overflow-y-auto">
            <h2 className="font-semibold mb-4">当前模式</h2>
            <div className="p-3 bg-muted rounded-lg mb-4">
              <p className="text-sm font-medium">
                {LEARNING_MODES[currentMode].icon} {LEARNING_MODES[currentMode].label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {LEARNING_MODES[currentMode].description}
              </p>
            </div>

            <h2 className="font-semibold mb-4">学习统计</h2>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">已答题：</span>
                <span className="font-medium">{user?.totalQuestions || 0}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">正确率：</span>
                <span className="font-medium">
                  {user?.totalQuestions 
                    ? Math.round((user?.correctAnswers || 0) / user.totalQuestions * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 模式切换确认弹窗 */}
      {showModeSwitch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">切换学习模式</h3>
            <p className="text-sm text-muted-foreground mb-4">
              切换到 <strong>{LEARNING_MODES[pendingMode!].label}</strong> 模式？
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              当前对话将保留在 {LEARNING_MODES[currentMode].label} 模式中，可以随时切换回来继续。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelModeSwitch}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={confirmModeSwitch}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
