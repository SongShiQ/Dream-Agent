'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { ExamPanel } from '@/components/ExamPanel';
import { useApp } from '@/lib/context/app-context';
import { useState } from 'react';

// 学习模式配置
const LEARNING_MODES = {
  chat: {
    icon: '💬',
    label: '智能问答',
    description: '随时提问，获得解答',
    placeholder: '输入你的问题...',
    prompt: '',
  },
  quiz: {
    icon: '📝',
    label: '练习模式',
    description: '做题练习，巩固知识',
    placeholder: '输入你想练习的知识点...',
    prompt: '请给我出几道练习题',
  },
  assess: {
    icon: '📊',
    label: '水平评估',
    description: '测试你的知识水平',
    placeholder: '输入你想评估的领域...',
    prompt: '请帮我评估一下我的操作系统知识水平',
  },
  plan: {
    icon: '📋',
    label: '学习计划',
    description: '制定个性化学习路径',
    placeholder: '输入你的学习目标...',
    prompt: '请帮我制定学习计划',
  },
  practice: {
    icon: '🎯',
    label: '专项训练',
    description: '针对薄弱点强化训练',
    placeholder: '输入你想训练的知识点...',
    prompt: '请针对这个知识点给我专项训练',
  },
};

export default function Home() {
  const { user, isLoggedIn, login, logout, currentMode, setMode, sendMessage } = useApp();
  const [showLogin, setShowLogin] = useState(!isLoggedIn);

  const handleLogin = (name: string) => {
    login(name);
    setShowLogin(false);
  };

  const handleModeChange = (mode: keyof typeof LEARNING_MODES) => {
    setMode(mode);
    // 如果有预设 prompt，自动发送
    if (LEARNING_MODES[mode].prompt) {
      setTimeout(() => {
        sendMessage(LEARNING_MODES[mode].prompt);
      }, 100);
    }
  };

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
                欢迎，{user?.name} · {LEARNING_MODES[currentMode].label}模式
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                已答 {user?.totalQuestions || 0} 题 · 
                正确率 {user?.totalQuestions ? Math.round((user?.correctAnswers || 0) / user.totalQuestions * 100) : 0}%
              </div>
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
                onClick={() => handleModeChange(key as keyof typeof LEARNING_MODES)}
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
            {currentMode === 'quiz' ? (
              <ExamPanel studentId={user?.studentId || ''} />
            ) : (
              <ChatPanel 
                mode={currentMode} 
                placeholder={LEARNING_MODES[currentMode].placeholder}
              />
            )}
          </div>

          {/* 右侧边栏 */}
          <aside className="w-80 border-l p-4 hidden lg:block overflow-y-auto">
            <h2 className="font-semibold mb-4">学习统计</h2>
            
            {/* 学习进度 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span>答题正确率</span>
                <span>{user?.totalQuestions ? Math.round((user?.correctAnswers || 0) / user.totalQuestions * 100) : 0}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${user?.totalQuestions ? Math.round((user?.correctAnswers || 0) / user.totalQuestions * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* 知识点掌握度 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">知识点掌握</h3>
              <div className="space-y-2">
                {Object.entries(user?.knowledgePoints || {}).slice(0, 5).map(([point, score]) => (
                  <div key={point}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{point}</span>
                      <span>{score}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(user?.knowledgePoints || {}).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    开始学习后将显示知识点掌握情况
                  </p>
                )}
              </div>
            </div>

            {/* 最近学习 */}
            <div>
              <h3 className="text-sm font-medium mb-2">学习记录</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {/* 这里显示最近的学习记录 */}
                <p className="text-xs text-muted-foreground">
                  暂无学习记录
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
