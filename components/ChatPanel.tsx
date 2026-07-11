'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context/app-context';

interface ChatPanelProps {
  mode?: string;
  placeholder?: string;
}

export function ChatPanel({ mode = 'chat', placeholder = '输入你的问题...' }: ChatPanelProps) {
  const { setMessageHandler, addRecord } = useApp();
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      // 记录 AI 回复
      addRecord({
        mode: mode as 'chat' | 'quiz' | 'practice' | 'plan' | 'assess',
        content: message.content,
        knowledgePoints: [],
      });
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 设置消息发送处理器
  useEffect(() => {
    setMessageHandler((content: string) => {
      if (append) {
        append({ role: 'user', content });
        // 记录用户消息
        addRecord({
          mode: mode as 'chat' | 'quiz' | 'practice' | 'plan' | 'assess',
          content,
          knowledgePoints: [],
        });
      }
    });
  }, [append, setMessageHandler, addRecord, mode]);

  // 监听快捷按钮发送的消息
  useEffect(() => {
    const handleMessageEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const content = customEvent.detail?.content;
      if (content && append) {
        append({ role: 'user', content });
      }
    };

    window.addEventListener('send-message', handleMessageEvent);
    return () => {
      window.removeEventListener('send-message', handleMessageEvent);
    };
  }, [append]);

  // 模式特定的欢迎消息
  const getWelcomeMessage = () => {
    switch (mode) {
      case 'assess':
        return '我来帮你评估操作系统知识水平。请回答以下问题：\n\n1. 什么是进程？进程和程序有什么区别？\n2. 解释虚拟内存的概念。\n3. 什么是死锁？如何避免？';
      case 'plan':
        return '我来帮你制定学习计划。请告诉我：\n\n1. 你的学习目标是什么？\n2. 每天可以投入多少时间？\n3. 有哪些基础知识已经掌握？';
      case 'practice':
        return '我来帮你进行专项训练。请告诉我你想训练的知识点，比如：\n\n- 进程管理\n- 内存管理\n- 文件系统\n- 并发编程';
      default:
        return '欢迎使用 OpenCamp AI 助教！\n\n我可以帮你：\n- 解答操作系统概念问题\n- 提供代码示例和解释\n- 推荐学习资源\n\n输入你的问题开始学习吧！';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <Card className="mr-12">
            <CardContent className="p-4">
              <p className="text-sm whitespace-pre-wrap">{getWelcomeMessage()}</p>
            </CardContent>
          </Card>
        )}
        
        {messages.map((message) => (
          <Card
            key={message.id}
            className={message.role === 'user' ? 'ml-12' : 'mr-12'}
          >
            <CardContent className="p-3">
              <p className="text-sm font-medium mb-1">
                {message.role === 'user' ? '你' : 'AI 助教'}
              </p>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </CardContent>
          </Card>
        ))}
        
        {isLoading && (
          <Card className="mr-12">
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground">思考中...</p>
            </CardContent>
          </Card>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          发送
        </Button>
      </form>
    </div>
  );
}
