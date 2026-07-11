'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useCallback } from 'react';

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 监听快捷按钮发送的消息
  const handleMessageEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const content = customEvent.detail?.content;
    if (content && append) {
      append({ role: 'user', content });
    }
  }, [append]);

  useEffect(() => {
    window.addEventListener('send-message', handleMessageEvent);
    return () => {
      window.removeEventListener('send-message', handleMessageEvent);
    };
  }, [handleMessageEvent]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">欢迎使用 OpenCamp AI 助教</p>
              <p className="text-sm">输入你的问题开始学习</p>
              <p className="text-xs mt-4">试试点击右侧的快捷功能按钮</p>
            </div>
          </div>
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
          placeholder="输入你的问题..."
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
