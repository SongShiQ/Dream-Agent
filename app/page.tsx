export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
          <p className="text-sm text-muted-foreground">
            多 Agent 架构 · 自适应学习
          </p>
        </header>
        <div className="flex-1 flex">
          <div className="flex-1 p-4">
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">聊天区域（待实现）</p>
            </div>
          </div>
          <aside className="w-80 border-l p-4">
            <h2 className="font-semibold mb-4">快捷功能</h2>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded hover:bg-muted transition-colors">
                📊 评估水平
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted transition-colors">
                📝 开始练习
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted transition-colors">
                📈 查看进度
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-muted transition-colors">
                📋 学习计划
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
