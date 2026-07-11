import { ChatPanel } from '@/components/ChatPanel';

export default function Home() {
  return (
    <main className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
          <p className="text-sm text-muted-foreground">
            多 Agent 架构 · 自适应学习
          </p>
        </header>
        <div className="flex-1 flex">
          <div className="flex-1">
            <ChatPanel />
          </div>
          <aside className="w-80 border-l p-4 hidden lg:block">
            <h2 className="font-semibold mb-4">快捷功能</h2>
            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border">
                <span className="mr-2">📊</span>
                <span className="font-medium">评估水平</span>
                <p className="text-xs text-muted-foreground mt-1">
                  测试你的操作系统知识水平
                </p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border">
                <span className="mr-2">📝</span>
                <span className="font-medium">开始练习</span>
                <p className="text-xs text-muted-foreground mt-1">
                  根据你的水平生成练习题
                </p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border">
                <span className="mr-2">📈</span>
                <span className="font-medium">查看进度</span>
                <p className="text-xs text-muted-foreground mt-1">
                  查看学习进度和完成情况
                </p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border">
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
