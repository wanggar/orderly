import { Message, MenuItem } from '@/types';

export interface ChatResponse {
  type: 'conversation' | 'recommendation';
  content: string;
  menuItems?: MenuItem[];
  functionCall?: {
    name: string;
    parameters: any;
  };
}

export async function sendChatMessage(
  message: string,
  conversationHistory: Array<{role: 'user' | 'assistant' | 'system', content: string}>
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationHistory
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to get response from chat API');
  }
}

export function convertMessagesToHistory(messages: Message[]): Array<{role: 'user' | 'assistant' | 'system', content: string}> {
  return messages
    .filter(msg => msg.type !== 'system') // Exclude system messages
    .map(msg => ({
      role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));
} 