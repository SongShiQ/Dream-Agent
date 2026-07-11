'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserState {
  studentId: string | null;
  name: string | null;
  currentStage: string;
  weakPoints: string[];
}

interface AppState {
  user: UserState;
  activePanel: 'chat' | 'exam' | 'progress' | 'plan' | 'assess';
  setUser: (user: Partial<UserState>) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  sendMessage: (content: string) => void;
}

const initialState: AppState = {
  user: {
    studentId: null,
    name: null,
    currentStage: 'pre_study_theory',
    weakPoints: [],
  },
  activePanel: 'chat',
  setUser: () => {},
  setActivePanel: () => {},
  sendMessage: () => {},
};

const AppContext = createContext<AppState>(initialState);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserState>(() => {
    // 从 localStorage 恢复用户状态
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opencamp-user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // 忽略解析错误
        }
      }
    }
    return initialState.user;
  });

  const [activePanel, setActivePanel] = useState<AppState['activePanel']>('chat');
  const [messageHandler, setMessageHandler] = useState<((content: string) => void) | null>(null);

  // 保存用户状态到 localStorage
  useEffect(() => {
    if (user.studentId) {
      localStorage.setItem('opencamp-user', JSON.stringify(user));
    }
  }, [user]);

  const setUser = (updates: Partial<UserState>) => {
    setUserState(prev => ({ ...prev, ...updates }));
  };

  const sendMessage = (content: string) => {
    if (messageHandler) {
      messageHandler(content);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      activePanel,
      setUser,
      setActivePanel,
      sendMessage,
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
