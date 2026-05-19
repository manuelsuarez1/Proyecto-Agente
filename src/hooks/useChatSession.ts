import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
  type MutableRefObject,
} from 'react';
import { loadConfig } from '../services/configService';
import {
  buildConversation,
  listConversations,
  loadConversation,
  persistConversation,
  renameConversation,
  saveConversation,
  scheduleDeleteConversation,
} from '../services/conversationService';
import type { ConversationMeta, Message } from '../shared/types';

function isSessionCurrent(epoch: number, sessionEpochRef: MutableRefObject<number>): boolean {
  return epoch === sessionEpochRef.current;
}

export function useChatSession() {
  const [history, setHistory] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState('');
  const [pendingReplyIds, setPendingReplyIds] = useState<string[]>([]);
  const [conversationModelId, setConversationModelId] = useState<string | null>(null);
  const [fallbackModelId, setFallbackModelId] = useState('default');

  const sessionEpochRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const pendingReplyRef = useRef(new Set<string>());
  const deletedConversationIdsRef = useRef(new Set<string>());

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const syncPendingState = useCallback(() => {
    setPendingReplyIds([...pendingReplyRef.current]);
  }, []);

  const addPendingReply = useCallback((id: string) => {
    pendingReplyRef.current.add(id);
    syncPendingState();
  }, [syncPendingState]);

  const removePendingReply = useCallback((id: string) => {
    pendingReplyRef.current.delete(id);
    syncPendingState();
  }, [syncPendingState]);

  const isConversationReplyPending = useCallback(
    (id: string) => pendingReplyIds.includes(id),
    [pendingReplyIds],
  );

  const isReplyPending = activeId !== null && isConversationReplyPending(activeId);

  const refreshHistory = useCallback(async () => {
    setHistory(await listConversations());
  }, []);

  useEffect(() => {
    let active = true;
    void listConversations().then(data => {
      if (active) setHistory(data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncDefaultModel = () => {
      void loadConfig().then(config => setFallbackModelId(config.activeModelId));
    };
    syncDefaultModel();
    window.addEventListener('config-updated', syncDefaultModel);
    return () => window.removeEventListener('config-updated', syncDefaultModel);
  }, []);

  const activeModelId = conversationModelId ?? fallbackModelId;

  const upsertHistoryMeta = useCallback((meta: ConversationMeta) => {
    setHistory(items => {
      const rest = items.filter(item => item.id !== meta.id);
      return [meta, ...rest];
    });
  }, []);

  const removeHistoryMeta = useCallback((id: string) => {
    setHistory(items => items.filter(item => item.id !== id));
  }, []);

  const startNewChat = useCallback(() => {
    sessionEpochRef.current += 1;
    setActiveId(null);
    activeIdRef.current = null;
    setMessages([]);
    setConversationModelId(null);
    setChatError('');
    setIsLoadingChat(false);
  }, []);

  const selectChat = useCallback(async (id: string) => {
    if (activeId === id) return;

    const epoch = ++sessionEpochRef.current;
    setActiveId(id);
    activeIdRef.current = id;
    setChatError('');
    setIsLoadingChat(true);

    try {
      const conversation = await loadConversation(id);
      if (!isSessionCurrent(epoch, sessionEpochRef)) return;
      setMessages(conversation?.messages ?? []);
      setConversationModelId(conversation?.modelId ?? null);
    } catch (err) {
      if (!isSessionCurrent(epoch, sessionEpochRef)) return;
      console.error('Error loading conversation:', err);
      setChatError('No se pudo cargar la conversación.');
      setMessages([]);
      setConversationModelId(null);
    } finally {
      if (isSessionCurrent(epoch, sessionEpochRef)) {
        setIsLoadingChat(false);
      }
    }
  }, [activeId]);

  const setChatModelId = useCallback((modelId: string) => {
    setConversationModelId(modelId);
    const convId = activeIdRef.current;
    if (!convId) return;

    void (async () => {
      try {
        const existing = await loadConversation(convId);
        if (existing) {
          await persistConversation({ ...existing, modelId });
          return;
        }
        if (messages.length > 0) {
          await persistConversation(buildConversation(convId, messages, modelId));
        }
      } catch (err) {
        console.error('Error saving chat model:', err);
      }
    })();
  }, [messages]);

  const removeChat = useCallback((id: string) => {
    const wasActive = activeId === id;
    const historySnapshot = history;

    deletedConversationIdsRef.current.add(id);

    startTransition(() => {
      removeHistoryMeta(id);
      removePendingReply(id);

      if (wasActive) {
        sessionEpochRef.current += 1;
        setActiveId(null);
        activeIdRef.current = null;
        setMessages([]);
        setConversationModelId(null);
        setChatError('');
      }
    });

    void scheduleDeleteConversation(id)
      .then(() => {
        deletedConversationIdsRef.current.delete(id);
      })
      .catch(err => {
        console.error('Error deleting conversation:', err);
        deletedConversationIdsRef.current.delete(id);
        setHistory(historySnapshot);
        if (wasActive) {
          void loadConversation(id).then(conversation => {
            if (!conversation) return;
            activeIdRef.current = id;
            setActiveId(id);
            setMessages(conversation.messages ?? []);
            setConversationModelId(conversation.modelId ?? null);
          });
        }
        setChatError('No se pudo eliminar la conversación.');
      });

    return true;
  }, [activeId, history, removeHistoryMeta, removePendingReply]);

  const renameChat = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return false;

    const previousHistory = history;
    setHistory(items => items.map(item => item.id === id ? { ...item, title: trimmed } : item));

    try {
      const meta = await renameConversation(id, trimmed);
      if (!meta) throw new Error('Conversation not found');
      upsertHistoryMeta(meta);
      return true;
    } catch (err) {
      console.error('Error renaming conversation:', err);
      setHistory(previousHistory);
      return false;
    }
  }, [history, upsertHistoryMeta]);

  const sendUserMessage = useCallback(async (
    content: string,
    fetchAssistantReply: (messages: Message[]) => Promise<string>,
    image?: string,
  ): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed && !image) return false;

    const creating = !activeIdRef.current;
    const conversationId = activeIdRef.current ?? crypto.randomUUID();

    if (deletedConversationIdsRef.current.has(conversationId)) return false;

    if (!creating && pendingReplyRef.current.has(conversationId)) {
      return false;
    }

    const sendEpoch = sessionEpochRef.current;
    const modelId = conversationModelId ?? fallbackModelId;
    const userMessage: Message = { 
      role: 'user', 
      content: trimmed,
      ...(image ? { image } : {})
    };
    const previousMessages = messages;
    const withUser: Message[] = [...messages, userMessage];

    addPendingReply(conversationId);
    setChatError('');

    if (creating) {
      activeIdRef.current = conversationId;
      setActiveId(conversationId);
      if (!conversationModelId) setConversationModelId(modelId);
      const draft = buildConversation(conversationId, withUser, modelId);
      upsertHistoryMeta({ id: draft.id, title: draft.title, date: draft.date });
    }

    if (isSessionCurrent(sendEpoch, sessionEpochRef) && activeIdRef.current === conversationId) {
      setMessages(withUser);
    }

    try {
      if (deletedConversationIdsRef.current.has(conversationId)) return true;

      const metaAfterUser = await saveConversation(conversationId, withUser, modelId);
      if (isSessionCurrent(sendEpoch, sessionEpochRef)) {
        upsertHistoryMeta(metaAfterUser);
      }

      if (deletedConversationIdsRef.current.has(conversationId)) return true;

      const reply = await fetchAssistantReply(withUser);
      const finalMessages: Message[] = [...withUser, { role: 'assistant', content: reply }];

      if (deletedConversationIdsRef.current.has(conversationId)) return true;

      await saveConversation(conversationId, finalMessages, modelId);

      if (
        isSessionCurrent(sendEpoch, sessionEpochRef)
        && activeIdRef.current === conversationId
      ) {
        setMessages(finalMessages);
        const finalMeta = buildConversation(conversationId, finalMessages, modelId);
        upsertHistoryMeta({ id: finalMeta.id, title: finalMeta.title, date: finalMeta.date });
      }

      return true;
    } catch (err) {
      if (isSessionCurrent(sendEpoch, sessionEpochRef) && activeIdRef.current === conversationId) {
        setMessages(previousMessages);

        if (creating) {
          sessionEpochRef.current += 1;
          activeIdRef.current = null;
          setActiveId(null);
          removeHistoryMeta(conversationId);
          deletedConversationIdsRef.current.add(conversationId);
          void scheduleDeleteConversation(conversationId).finally(() => {
            deletedConversationIdsRef.current.delete(conversationId);
          });
        }

        const message = err instanceof Error ? err.message : 'Error al enviar el mensaje.';
        setChatError(message);
        console.error('sendUserMessage error:', err);
      }
      return false;
    } finally {
      removePendingReply(conversationId);
    }
  }, [messages, conversationModelId, fallbackModelId, addPendingReply, removePendingReply, removeHistoryMeta, upsertHistoryMeta]);

  const isNewChat = activeId === null && messages.length === 0 && !isLoadingChat;

  return {
    history,
    activeId,
    messages,
    isLoadingChat,
    isReplyPending,
    isConversationReplyPending,
    pendingReplyIds,
    chatError,
    activeModelId,
    setChatModelId,
    isNewChat,
    startNewChat,
    selectChat,
    removeChat,
    renameChat,
    sendUserMessage,
    setChatError,
    refreshHistory,
  };
}
