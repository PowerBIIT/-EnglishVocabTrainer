import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ChatRole = 'user' | 'assistant';

type ChatMessageProps = {
  role: ChatRole;
  children: ReactNode;
  className?: string;
  bubbleClassName?: string;
};

export function ChatMessage({
  role,
  children,
  className,
  bubbleClassName,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        'chat-message',
        role === 'user' ? 'chat-message-user' : 'chat-message-assistant',
        className
      )}
    >
      <div
        className={cn(
          'chat-bubble',
          role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant',
          bubbleClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
