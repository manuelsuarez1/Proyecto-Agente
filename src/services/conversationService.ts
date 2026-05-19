import type { Conversation, ConversationMeta, Message } from '../shared/types';

const BROWSER_CONVERSATIONS_KEY = 'agentx.conversations';
const BROWSER_CONVERSATION_INDEX_KEY = 'agentx.conversationIndex';

let cachedIndex: ConversationMeta[] | null = null;

function today(): string {
  return new Date().toLocaleDateString();
}

export function titleFromMessages(messages: Message[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user')?.content.trim();
  if (!firstUserMessage) return 'Nueva conversación';
  return firstUserMessage.length > 30 ? `${firstUserMessage.substring(0, 30)}...` : firstUserMessage;
}

export function buildConversation(id: string, messages: Message[], modelId?: string): Conversation {
  return {
    id,
    title: titleFromMessages(messages),
    date: today(),
    messages,
    ...(modelId ? { modelId } : {}),
  };
}

function sortIndex(index: ConversationMeta[]): ConversationMeta[] {
  return [...index].sort((a, b) => b.id.localeCompare(a.id));
}

function setCachedIndex(index: ConversationMeta[]): ConversationMeta[] {
  cachedIndex = sortIndex(index);
  return cachedIndex;
}

export function getCachedIndex(): ConversationMeta[] {
  return cachedIndex ? [...cachedIndex] : [];
}

export async function listConversations(): Promise<ConversationMeta[]> {
  if (!window.electronAPI) {
    return setCachedIndex(readBrowserConversationIndex());
  }

  const index = await window.electronAPI.listConversations();
  return setCachedIndex(index);
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  if (!window.electronAPI) {
    return readBrowserConversations()[id] || null;
  }

  const content = await window.electronAPI.readFile(`conversations/${id}.json`);
  if (!content) return null;

  const parsed = JSON.parse(content) as Conversation;
  return {
    id: parsed.id,
    title: parsed.title,
    date: parsed.date,
    messages: parsed.messages || [],
    modelId: parsed.modelId,
  };
}

export async function persistConversation(conversation: Conversation): Promise<ConversationMeta> {
  if (!window.electronAPI) {
    const conversations = readBrowserConversations();
    conversations[conversation.id] = conversation;
    writeBrowserConversations(conversations);

    const index = cachedIndex ?? readBrowserConversationIndex();
    const meta = { id: conversation.id, title: conversation.title, date: conversation.date };
    const existing = index.findIndex(item => item.id === conversation.id);
    const next = [...index];
    if (existing >= 0) next[existing] = meta;
    else next.unshift(meta);
    writeBrowserConversationIndex(sortIndex(next));
    return setCachedIndex(next).find(item => item.id === conversation.id)!;
  }

  const { meta, index } = await window.electronAPI.saveConversation(conversation);
  return setCachedIndex(index).find(item => item.id === meta.id) ?? meta;
}

export async function saveConversation(
  id: string,
  messages: Message[],
  modelId?: string,
): Promise<ConversationMeta> {
  let conversation = buildConversation(id, messages, modelId);

  if (!modelId) {
    const existing = await loadConversation(id);
    if (existing?.modelId) {
      conversation = { ...conversation, modelId: existing.modelId };
    }
  }

  return persistConversation(conversation);
}

export function removeConversationFromCache(id: string): ConversationMeta[] {
  const base = cachedIndex ?? readBrowserConversationIndex();
  return setCachedIndex(base.filter(item => item.id !== id));
}

function persistBrowserDelete(id: string): void {
  const conversations = readBrowserConversations();
  delete conversations[id];
  writeBrowserConversations(conversations);
  writeBrowserConversationIndex(getCachedIndex());
}

export function scheduleDeleteConversation(id: string): Promise<void> {
  removeConversationFromCache(id);

  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        if (!window.electronAPI) {
          persistBrowserDelete(id);
          resolve();
          return;
        }
        await window.electronAPI.deleteConversation(id);
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => { void run(); }, { timeout: 100 });
    } else {
      window.setTimeout(() => { void run(); }, 0);
    }
  });
}

export async function deleteConversation(id: string): Promise<void> {
  removeConversationFromCache(id);

  if (!window.electronAPI) {
    persistBrowserDelete(id);
    return;
  }

  await window.electronAPI.deleteConversation(id);
}

export async function renameConversation(id: string, title: string): Promise<ConversationMeta | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const conversation = await loadConversation(id);
  if (!conversation) return null;

  return persistConversation({ ...conversation, title: trimmed });
}

function readBrowserConversations(): Record<string, Conversation> {
  const stored = window.localStorage.getItem(BROWSER_CONVERSATIONS_KEY);
  return stored ? JSON.parse(stored) as Record<string, Conversation> : {};
}

function writeBrowserConversations(conversations: Record<string, Conversation>): void {
  window.localStorage.setItem(BROWSER_CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function readBrowserConversationIndex(): ConversationMeta[] {
  const stored = window.localStorage.getItem(BROWSER_CONVERSATION_INDEX_KEY);
  return stored ? JSON.parse(stored) as ConversationMeta[] : [];
}

function writeBrowserConversationIndex(index: ConversationMeta[]): void {
  window.localStorage.setItem(BROWSER_CONVERSATION_INDEX_KEY, JSON.stringify(index));
}
