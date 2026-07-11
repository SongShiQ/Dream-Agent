'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// 学习模式
type LearningMode = 'chat' | 'quiz' | 'practice' | 'plan' | 'assess';

// 学习者档案
interface LearnerProfile {
  studentId: string;
  name: string;
  currentStage: string;
  knowledgePoints: Record<string, number>; // 知识点 -> 掌握度 (0-100)
  weakPoints: string[];
  learningStyle: 'visual' | 'reading' | 'practice' | 'mixed';
  totalQuestions: number;
  correctAnswers: number;
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
  // 用户
  user: LearnerProfile | null;
  isLoggedIn: boolean;
  
  // 学习模式
  currentMode: LearningMode;
  setMode: (mode: LearningMode) => void;
  
  // 学习记录
  records: LearningRecord[];
  addRecord: (record: Omit<LearningRecord, 'id' | 'timestamp'>) => void;
  
  // 用户操作
  login: (name: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<LearnerProfile>) => void;
  
  // 消息发送
  sendMessage: (content: string) => void;
  messageHandler: ((content: string) => void) | null;
  setMessageHandler: (handler: (content: string) => void) => void;
}

const initialState: AppState = {
  user: null,
  isLoggedIn: false,
  currentMode: 'chat',
  setMode: () => {},
  records: [],
  addRecord: () => {},
  login: () => {},
  logout: () => {},
  updateProfile: () => {},
  sendMessage: () => {},
  messageHandler: null,
  setMessageHandler: () => {},
};

const AppContext = createContext<AppState>(initialState);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LearnerProfile | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opencamp-learner');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...parsed, lastActive: new Date(parsed.lastActive) };
        } catch {
          // 忽略解析错误
        }
      }
    }
    return null;
  });

  const [currentMode, setCurrentMode] = useState<LearningMode>('chat');
  const [records, setRecords] = useState<LearningRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opencamp-records');
      if (saved) {
        try {
          return JSON.parse(saved).map((r: LearningRecord) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          }));
        } catch {
          // 忽略解析错误
        }
      }
    }
    return [];
  });

  const [messageHandler, setMessageHandler] = useState<((content: string) => void) | null>(null);

  // 保存用户状态
  useEffect(() => {
    if (user) {
      localStorage.setItem('opencamp-learner', JSON.stringify(user));
    } else {
      localStorage.removeItem('opencamp-learner');
    }
  }, [user]);

  // 保存学习记录
  useEffect(() => {
    localStorage.setItem('opencamp-records', JSON.stringify(records));
  }, [records]);

  const login = useCallback((name: string) => {
    const studentId = `learner_${Date.now()}`;
    const newUser: LearnerProfile = {
      studentId,
      name,
      currentStage: 'pre_study_theory',
      knowledgePoints: {},
      weakPoints: [],
      learningStyle: 'mixed',
      totalQuestions: 0,
      correctAnswers: 0,
      lastActive: new Date(),
    };
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRecords([]);
  }, []);

  const updateProfile = useCallback((updates: Partial<LearnerProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates, lastActive: new Date() } : null);
  }, []);

  const addRecord = useCallback((record: Omit<LearningRecord, 'id' | 'timestamp'>) => {
    const newRecord: LearningRecord = {
      ...record,
      id: `record_${Date.now()}`,
      timestamp: new Date(),
    };
    setRecords(prev => [...prev, newRecord]);
    
    // 更新用户统计
    if (record.mode === 'quiz' || record.mode === 'practice') {
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          totalQuestions: prev.totalQuestions + 1,
          correctAnswers: prev.correctAnswers + (record.result === 'correct' ? 1 : 0),
          lastActive: new Date(),
        };
      });
    }
  }, []);

  const setMode = useCallback((mode: LearningMode) => {
    setCurrentMode(mode);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (messageHandler) {
      messageHandler(content);
    }
  }, [messageHandler]);

  return (
    <AppContext.Provider value={{
      user,
      isLoggedIn: !!user,
      currentMode,
      setMode,
      records,
      addRecord,
      login,
      logout,
      updateProfile,
      sendMessage,
      messageHandler,
      setMessageHandler,
    }}>
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
