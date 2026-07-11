'use client';

import { ChatPanel } from '@/components/ChatPanel';
import { ExamPanel } from '@/components/ExamPanel';
import { ProgressPanel } from '@/components/ProgressPanel';
import { useApp } from '@/lib/context/app-context';
import { useState } from 'react';

export default function Home() {
  const { user, setUser, activePanel, setActivePanel } = useApp();
  const [showLogin, setShowLogin] = useState(!user.studentId);

  const handleLogin = (name: string) => {
    const studentId = `student_${Date.now()}`;
    setUser({ studentId, name });
    setShowLogin(false);
  };

  const handleQuickAction = (action: string) => {
    // 发送预设消息到聊天
    const messages: Record<string, string> = {
      assess: '请帮我评估一下我的操作系统知识水平',
      exam: '请给我出几道练习题',
      progress: '请查看我的学习进度',
      plan: '请帮我制定学习计划',
    };
    
    // 切换到聊天面板并发送消息
    setActivePanel('chat');
    // 通过自定义事件发送消息
    window.dispatchEvent(new CustomEvent('send-message', { 
      detail: { content: messages[action] || '' } 
    }));
  };

  if (showLogin) {
    return (
      <main className="flex h-screen bg-background items-center justify-center">
        <div className="w-96 p-8 border rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">欢迎使用 OpenCamp AI 助教</h1>
          <p className="text-muted-foreground mb-6">
            请输入你的名字开始学习
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
              placeholder="输入你的名字..."
              className="w-full p-3 border rounded-lg mb-4"
              required
            />
            <button
              type="submit"
              className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              开始学习
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
            <p className="text-sm text-muted-foreground">
              多 Agent 架构 · 自适应学习
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            欢迎，{user.name}
          </div>
        </header>
        <div className="flex-1 flex">
          <div className="flex-1">
            <ChatPanel />
          </div>
          <aside className="w-80 border-l p-4 hidden lg:block">
            <h2 className="font-semibold mb-4">快捷功能</h2>
            <div className="space-y-2">
              <button 
                onClick={() => handleQuickAction('assess')}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border"
              >
                <span className="mr-2">📊</span>
                <span className="font-medium">评估水平</span>
                <p className="text-xs text-muted-foreground mt-1">
                  测试你的操作系统知识水平
                </p>
              </button>
              <button 
                onClick={() => handleQuickAction('exam')}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border"
              >
                <span className="mr-2">📝</span>
                <span className="font-medium">开始练习</span>
                <p className="text-xs text-muted-foreground mt-1">
                  根据你的水平生成练习题
                </p>
              </button>
              <button 
                onClick={() => handleQuickAction('progress')}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border"
              >
                <span className="mr-2">📈</span>
                <span className="font-medium">查看进度</span>
                <p className="text-xs text-muted-foreground mt-1">
                  查看学习进度和完成情况
                </p>
              </button>
              <button 
                onClick={() => handleQuickAction('plan')}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border"
              >
                <span className="mr-2">📋</span>
                <span className="font-medium">学习计划</span>
                <p className="text-xs text-muted-foreground mt-1">
                  生成个性化学习计划
                </p>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
