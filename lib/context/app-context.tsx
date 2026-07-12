'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

// 学习模式
type LearningMode = 'chat' | 'quiz' | 'practice' | 'plan' | 'assess' | 'lab' | 'report';

type MessageHandler = (content: string) => void;

// 学习者档案
interface LearnerProfile {
  studentId: string;
  name: string;
  currentStage: string;
  knowledgePoints: Record<string, number>;
  weakPoints: string[];
  learningStyle: 'visual' | 'reading' | 'practice' | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
  currentDifficulty: number;
  lastActive: Date;
}

// 学习记录
interface LearningRecord {
  id: string;
  timestamp: Date;
  mode: LearningMode;
  content: string;
  result?: 'correct' | 'incorrect' | 'partial';
  knowledgePoints: string[];
}

// 应用状态
interface AppState {
  user: LearnerProfile | null;
  isLoggedIn: boolean;
  isReady: boolean;
  loginError: string | null;
  isLoggingIn: boolean;

  currentMode: LearningMode;
  setMode: (mode: LearningMode) => void;

  records: LearningRecord[];
  addRecord: (record: Omit<LearningRecord, 'id' | 'timestamp'>) => void;

  login: (name: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<LearnerProfile>) => void;
  refreshStats: () => Promise<void>;

  sendMessage: (content: string) => void;
  setMessageHandler: (handler: MessageHandler | null) => void;
}

function parseWeakPoints(raw: unknown): string[] {
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

function studentToProfile(student: {
  id: string;
  name: string;
  currentStage?: string;
  weakPoints?: unknown;
  stats?: {
    totalQuestions?: number;
    correctAnswers?: number;
    currentDifficulty?: number;
  };
}): LearnerProfile {
  return {
    studentId: student.id,
    name: student.name,
    currentStage: student.currentStage || 'pre_study_theory',
    knowledgePoints: {},
    weakPoints: parseWeakPoints(student.weakPoints),
    learningStyle: 'mixed',
    totalQuestions: student.stats?.totalQuestions ?? 0,
    correctAnswers: student.stats?.correctAnswers ?? 0,
    currentDifficulty: student.stats?.currentDifficulty ?? 50,
    lastActive: new Date(),
  };
}

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  isReady: false,
  loginError: null,
  isLoggingIn: false,
  currentMode: 'chat',
  setMode: () => {},
  records: [],
  addRecord: () => {},
  login: async () => false,
  logout: () => {},
  updateProfile: () => {},
  refreshStats: async () => {},
  sendMessage: () => {},
  setMessageHandler: () => {},
};

const AppContext = createContext<AppState>(initialState);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LearnerProfile | null>(null);
  const [currentMode, setCurrentMode] = useState<LearningMode>('chat');
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const messageHandlerRef = useRef<MessageHandler | null>(null);

  // 恢复 localStorage；若有 studentId 则向服务端校验并刷新 stats
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const savedUser = localStorage.getItem('opencamp-learner');
        const savedRecords = localStorage.getItem('opencamp-records');
        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords).map((r: LearningRecord) => ({
              ...r,
              timestamp: new Date(r.timestamp),
            }));
            if (!cancelled) setRecords(parsed);
          } catch {
            /* ignore */
          }
        }

        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // 旧版假 id（learner_*）直接丢弃，要求重新登录
          if (typeof parsed.studentId === 'string' && !parsed.studentId.startsWith('learner_')) {
            try {
              const res = await fetch(`/api/student?id=${encodeURIComponent(parsed.studentId)}`);
              if (res.ok) {
                const data = await res.json();
                if (!cancelled && data.student) {
                  setUser(studentToProfile(data.student));
                }
              } else if (!cancelled) {
                // 服务端无此人：清本地
                localStorage.removeItem('opencamp-learner');
              }
            } catch {
              // 离线时暂用缓存
              if (!cancelled) {
                setUser({
                  ...parsed,
                  weakPoints: parseWeakPoints(parsed.weakPoints),
                  currentDifficulty: parsed.currentDifficulty ?? 50,
                  lastActive: new Date(parsed.lastActive || Date.now()),
                });
              }
            }
          } else {
            localStorage.removeItem('opencamp-learner');
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (user) {
      localStorage.setItem('opencamp-learner', JSON.stringify(user));
    } else {
      localStorage.removeItem('opencamp-learner');
    }
  }, [user, isReady]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem('opencamp-records', JSON.stringify(records));
  }, [records, isReady]);

  const login = useCallback(async (name: string): Promise<boolean> => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.student?.id) {
        setLoginError(data.error || '登录失败，请检查服务是否运行');
        return false;
      }
      setUser(studentToProfile(data.student));
      return true;
    } catch {
      setLoginError('无法连接服务器，请确认 npm run dev 已启动');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRecords([]);
    setLoginError(null);
    messageHandlerRef.current = null;
  }, []);

  const updateProfile = useCallback((updates: Partial<LearnerProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updates, lastActive: new Date() } : null));
  }, []);

  const refreshStats = useCallback(async () => {
    if (!user?.studentId) return;
    try {
      const res = await fetch(`/api/student?id=${encodeURIComponent(user.studentId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.student) {
        setUser(studentToProfile(data.student));
      }
    } catch {
      /* ignore */
    }
  }, [user?.studentId]);

  const addRecord = useCallback((record: Omit<LearningRecord, 'id' | 'timestamp'>) => {
    const newRecord: LearningRecord = {
      ...record,
      id: `record_${Date.now()}`,
      timestamp: new Date(),
    };
    setRecords((prev) => [...prev, newRecord]);
  }, []);

  const setMode = useCallback((mode: LearningMode) => {
    setCurrentMode(mode);
  }, []);

  const setMessageHandler = useCallback((handler: MessageHandler | null) => {
    messageHandlerRef.current = handler;
  }, []);

  const sendMessage = useCallback((content: string) => {
    messageHandlerRef.current?.(content);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isReady,
        loginError,
        isLoggingIn,
        currentMode,
        setMode,
        records,
        addRecord,
        login,
        logout,
        updateProfile,
        refreshStats,
        sendMessage,
        setMessageHandler,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
