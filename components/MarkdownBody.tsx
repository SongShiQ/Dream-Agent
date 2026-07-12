'use client';

import ReactMarkdown from 'react-markdown';

type Props = {
  content: string;
  className?: string;
  /** 紧凑样式（知识卡片） */
  compact?: boolean;
};

/**
 * 渲染 Markdown 文本。知识卡片与题解多为 md 源文件，不能当纯文本展示。
 */
export function MarkdownBody({ content, className = '', compact = false }: Props) {
  if (!content?.trim()) return null;

  return (
    <div
      className={`markdown-body text-foreground ${
        compact ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'
      } ${className}`}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-3 mb-1.5 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className: cn, children, ...props }) => {
            const isBlock = typeof cn === 'string' && cn.includes('language-');
            if (isBlock) {
              return (
                <code className={`${cn || ''} text-[11px]`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 p-2 rounded-lg bg-muted/80 overflow-x-auto text-[11px] font-mono">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline text-primary"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/40 pl-3 my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
