'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { ExamPanel } from '@/components/ExamPanel';
import { AssessPanel } from '@/components/AssessPanel';
import { PlanPanel } from '@/components/PlanPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { PracticePanel } from '@/components/PracticePanel';
import { WrongBookPanel } from '@/components/WrongBookPanel';
import { LearningMapPanel } from '@/components/LearningMapPanel';
import { LabPanel } from '@/components/LabPanel';
import { ReportPanel } from '@/components/ReportPanel';
import { useApp } from '@/lib/context/app-context';
import { STAGE_LABELS } from '@/lib/adaptive/stage';

const LEARNING_MODES = {
  chat: { icon: '💬', label: '智能问答', placeholder: '输入你的问题...' },
  quiz: { icon: '📝', label: '练习模式', placeholder: '输入你想练习的知识点...' },
  assess: { icon: '📊', label: '水平评估', placeholder: '输入你想评估的领域...' },
  plan: { icon: '📋', label: '学习计划', placeholder: '输入你的学习目标...' },
  practice: { icon: '🎯', label: '专项训练', placeholder: '输入你想训练的知识点...' },
  lab: { icon: '🧪', label: '实验反馈', placeholder: '' },
  report: { icon: '📄', label: '学习报告', placeholder: '' },
};

type ModeKey = keyof typeof LEARNING_MODES;

export default function Home() {
  const {
    user,
    isLoggedIn,
    isReady,
    login,
    logout,
    loginError,
    isLoggingIn,
    currentMode,
    setMode,
  } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showWrongBook, setShowWrongBook] = useState(false);
  /** 登录后默认学习地图（今日三步 + 路径） */
  const [showMap, setShowMap] = useState(true);
  /** 卡住一键过关：按知识点快练 */
  const [drillKp, setDrillKp] = useState<string | null>(null);
  const [drillFocusWeak, setDrillFocusWeak] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const clearDrill = () => {
    setDrillKp(null);
    setDrillFocusWeak(false);
  };

  const showToast = (msg: string) => {
    setCopyToast(msg);
    window.setTimeout(() => setCopyToast(null), 2000);
  };

  const copyStudentId = async () => {
    if (!user?.studentId) return;
    try {
      await navigator.clipboard.writeText(user.studentId);
      showToast('已复制完整 Student ID');
    } catch {
      showToast('复制失败，请打开设置手动复制');
    }
  };

  /** 从错题/薄弱点进入：3 题快练 + 卡片 */
  const startQuickDrill = (opts?: { knowledgePoint?: string; focusWeak?: boolean }) => {
    setShowWrongBook(false);
    setShowMap(false);
    setDrillKp(opts?.knowledgePoint || null);
    setDrillFocusWeak(!!opts?.focusWeak && !opts?.knowledgePoint);
    setMode('practice');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    if (name?.trim()) {
      await login(name.trim());
    }
  };

  const handleModeChange = (mode: ModeKey) => {
    setShowWrongBook(false);
    setShowMap(false);
    clearDrill();
    setMode(mode);
  };

  const navigateFromMap = (target: ModeKey | 'wrongbook') => {
    if (target === 'wrongbook') {
      setShowMap(false);
      setShowWrongBook(true);
      clearDrill();
      return;
    }
    setShowWrongBook(false);
    setShowMap(false);
    // 地图「卡住过关」进专项时默认薄弱点 3 题快练
    if (target === 'practice') {
      const weaks = user?.weakPoints || [];
      if (weaks.length > 0) {
        startQuickDrill({ focusWeak: true });
        return;
      }
    }
    clearDrill();
    setMode(target);
  };

  if (!isReady) {
    return (
      <main className="flex h-screen bg-background items-center justify-center">
        <div className="w-96 p-8 border rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-2">OpenCamp AI 助教</h1>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex h-screen bg-background items-center justify-center">
        <div className="w-96 p-8 border rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2">OpenCamp AI 助教</h1>
          <p className="text-muted-foreground mb-6">基于多 Agent 架构的智能学习助手</p>

          <form onSubmit={handleLogin}>
            <input
              name="name"
              type="text"
              placeholder="输入你的名字开始学习..."
              className="w-full p-3 border rounded-lg mb-4 bg-background"
              required
              autoFocus
              disabled={isLoggingIn}
            />
            {loginError && (
              <p className="text-sm text-red-600 mb-3">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? '登录中...' : '开始学习'}
            </button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <p className="mb-2">登录后进入学习地图：今日三步 + 总体路径（类多邻国）</p>
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

  const accuracy =
    user && user.totalQuestions > 0
      ? Math.round((user.correctAnswers / user.totalQuestions) * 100)
      : 0;

  const isNewUser = (user?.totalQuestions ?? 0) === 0;

  return (
    <main className="flex h-screen bg-background">
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {copyToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-foreground text-background text-sm shadow-lg">
          {copyToast}
        </div>
      )}

      {logoutConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLogoutConfirm(false);
          }}
        >
          <div className="bg-background border rounded-xl p-5 max-w-sm w-full space-y-3 shadow-lg">
            <p className="font-medium">确认退出登录？</p>
            <p className="text-sm text-muted-foreground">
              本机缓存的学习记录会被清空；服务端进度（答题、阶段）仍保留，用同一姓名可再次登录。
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
                onClick={() => setLogoutConfirm(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground"
                onClick={() => {
                  setLogoutConfirm(false);
                  clearDrill();
                  logout();
                }}
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-bold">OpenCamp AI 助教</h1>
              <p className="text-sm text-muted-foreground">
                欢迎，{user?.name}
                <span className="ml-2 text-xs opacity-70" title={user?.studentId}>
                  id: {user?.studentId?.slice(0, 8)}…
                </span>
                <button
                  type="button"
                  className="ml-2 text-xs underline hover:text-foreground"
                  title="复制完整 Student ID（供 CLI init）"
                  onClick={() => void copyStudentId()}
                >
                  复制完整 ID
                </button>
                <button
                  type="button"
                  className="ml-2 text-xs underline hover:text-foreground"
                  onClick={() => setShowSettings(true)}
                >
                  CLI 对齐说明
                </button>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                设置
              </button>
              <button
                onClick={() => setLogoutConfirm(true)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                退出登录
              </button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowWrongBook(false);
                setShowMap(true);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showMap && !showWrongBook
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span>🗺️</span>
              <span>学习地图</span>
            </button>
            {Object.entries(LEARNING_MODES).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => handleModeChange(key as ModeKey)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !showMap && !showWrongBook && currentMode === key
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

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 min-h-0 relative">
            {/* 保持各模块挂载，切换时仅隐藏，避免练习/聊天状态丢失 */}
            <div className={showMap && !showWrongBook ? 'h-full' : 'hidden'}>
              <LearningMapPanel onNavigate={navigateFromMap} />
            </div>
            <div className={!showMap && showWrongBook ? 'h-full' : 'hidden'}>
              <WrongBookPanel
                studentId={user?.studentId || ''}
                onRetry={(_qid, kp) => {
                  startQuickDrill({
                    knowledgePoint: kp,
                    focusWeak: !kp,
                  });
                }}
              />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'quiz' ? 'h-full' : 'hidden'
              }
            >
              <ExamPanel
                studentId={user?.studentId || ''}
                title="练习模式"
                onExit={() => {
                  setShowWrongBook(false);
                  setShowMap(true);
                }}
              />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'assess' ? 'h-full' : 'hidden'
              }
            >
              <AssessPanel
                studentId={user?.studentId || ''}
                onContinue={(target) => {
                  if (target === 'map') {
                    clearDrill();
                    setShowWrongBook(false);
                    setShowMap(true);
                    return;
                  }
                  if (target === 'practice') {
                    startQuickDrill({ focusWeak: true });
                    return;
                  }
                  clearDrill();
                  setShowWrongBook(false);
                  setShowMap(false);
                  setMode(target === 'quiz' ? 'quiz' : target === 'plan' ? 'plan' : 'lab');
                }}
              />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'plan' ? 'h-full' : 'hidden'
              }
            >
              <PlanPanel studentId={user?.studentId || ''} />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'practice' ? 'h-full' : 'hidden'
              }
            >
              {drillKp || drillFocusWeak ? (
                <div className="h-full flex flex-col">
                  <div className="p-2 border-b flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground"
                      onClick={clearDrill}
                    >
                      ← 返回专项
                    </button>
                    <span className="text-xs text-muted-foreground">卡住一键过关 · 3 题</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ExamPanel
                      studentId={user?.studentId || ''}
                      knowledgePoint={drillKp || undefined}
                      focusWeak={drillFocusWeak}
                      title="卡住一键过关"
                      targetCount={3}
                      autoStart
                      onSessionComplete={() => {
                        clearDrill();
                        setShowWrongBook(false);
                        setShowMap(true);
                      }}
                      onExit={() => {
                        clearDrill();
                        setShowMap(true);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <PracticePanel
                  studentId={user?.studentId || ''}
                  onQuickDrill={(kp) => startQuickDrill({ knowledgePoint: kp })}
                  onQuickWeak={() => startQuickDrill({ focusWeak: true })}
                />
              )}
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'lab' ? 'h-full' : 'hidden'
              }
            >
              <LabPanel studentId={user?.studentId || ''} />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'report' ? 'h-full' : 'hidden'
              }
            >
              <ReportPanel studentId={user?.studentId || ''} />
            </div>
            <div
              className={
                !showMap && !showWrongBook && currentMode === 'chat' ? 'h-full' : 'hidden'
              }
            >
              <ChatPanel mode="chat" placeholder={LEARNING_MODES.chat.placeholder} />
            </div>
          </div>

          <aside className="w-80 border-l p-4 hidden lg:block overflow-y-auto">
            <h2 className="font-semibold mb-4">当前</h2>
            <div className="p-3 bg-muted rounded-lg mb-4">
              <p className="text-sm font-medium">
                {showMap
                  ? '🗺️ 学习地图'
                  : showWrongBook
                    ? '📕 错题本'
                    : `${LEARNING_MODES[currentMode].icon} ${LEARNING_MODES[currentMode].label}`}
              </p>
            </div>
            {!showMap && (
              <button
                onClick={() => {
                  setShowWrongBook(false);
                  setShowMap(true);
                }}
                className="w-full mb-4 text-left text-sm p-2 border rounded-lg hover:bg-muted"
              >
                回到学习地图
              </button>
            )}

            <h2 className="font-semibold mb-2">下一步建议</h2>
            <p className="text-xs text-muted-foreground mb-2">与学习地图「今日三步」同一逻辑</p>
            <div className="space-y-2 mb-4">
              {isNewUser ? (
                <>
                  <button
                    onClick={() => handleModeChange('assess')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted border-primary/40 bg-primary/5"
                  >
                    1. 水平摸底 · 约 5 题（先做这个）
                  </button>
                  <button
                    onClick={() => handleModeChange('quiz')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    2. 练习打底 · 熟悉反馈
                  </button>
                  <button
                    onClick={() => {
                      setShowWrongBook(false);
                      setShowMap(true);
                    }}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    3. 回地图看路径与 lab
                  </button>
                </>
              ) : (user?.weakPoints?.length ?? 0) > 0 ? (
                <>
                  <button
                    onClick={() => startQuickDrill({ focusWeak: true })}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted border-primary/40 bg-primary/5"
                  >
                    1. 卡住一键过关 · 3 题
                  </button>
                  <button
                    onClick={() => {
                      clearDrill();
                      setShowMap(false);
                      setShowWrongBook(true);
                    }}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    2. 打开错题本订正
                  </button>
                  <button
                    onClick={() => handleModeChange('lab')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    3. 实验反馈 / 推进 lab
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleModeChange('quiz')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted border-primary/40 bg-primary/5"
                  >
                    1. 继续练习 5 题
                  </button>
                  <button
                    onClick={() => handleModeChange('plan')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    2. 今日计划（可自定义）
                  </button>
                  <button
                    onClick={() => handleModeChange('lab')}
                    className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
                  >
                    3. 实验反馈
                  </button>
                </>
              )}
            </div>

            <h2 className="font-semibold mb-4">学习统计（服务端）</h2>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">已答题：</span>
                <span className="font-medium">{user?.totalQuestions || 0}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">正确率：</span>
                <span className="font-medium">{accuracy}%</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">当前难度：</span>
                <span className="font-medium">{user?.currentDifficulty ?? 50}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">阶段：</span>
                <span className="font-medium">
                  {STAGE_LABELS[user?.currentStage || ''] || user?.currentStage || '—'}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {user?.currentStage}
                </span>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <button
                onClick={() => startQuickDrill({ focusWeak: true })}
                className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
              >
                卡住一键过关 · 3 题
              </button>
              <button
                onClick={() => {
                  clearDrill();
                  setShowWrongBook(false);
                  setShowMap(false);
                  setMode('practice');
                }}
                className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
              >
                专项训练（选题）
              </button>
              <button
                onClick={() => {
                  clearDrill();
                  setShowMap(false);
                  setShowWrongBook(true);
                }}
                className="w-full text-left text-sm p-2 border rounded-lg hover:bg-muted"
              >
                打开错题本
              </button>
              {showWrongBook && (
                <button
                  onClick={() => setShowWrongBook(false)}
                  className="w-full text-left text-xs text-muted-foreground underline"
                >
                  关闭错题本
                </button>
              )}
            </div>

            {user?.weakPoints && user.weakPoints.length > 0 && (
              <>
                <h2 className="font-semibold mt-6 mb-2">薄弱知识点（点标签过关）</h2>
                <div className="flex flex-wrap gap-1">
                  {user.weakPoints.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => startQuickDrill({ knowledgePoint: p })}
                      className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                      title="一键过关 3 题"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
