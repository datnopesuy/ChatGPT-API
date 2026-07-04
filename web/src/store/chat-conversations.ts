"use client";

import localforage from "localforage";

export type ChatRole = "user" | "assistant";

export type StoredChatImage = {
  name: string;
  type: string;
  dataUrl: string;
};

export type ChatMessageItem = {
  id: string;
  role: ChatRole;
  content: string;
  images?: StoredChatImage[];
  createdAt: string;
  /** Đánh dấu tin nhắn assistant đang được stream (chưa hoàn tất). */
  pending?: boolean;
  error?: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  model: string;
  reasoningEffort: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageItem[];
};

const chatConversationStorage = localforage.createInstance({
  name: "chatgpt2api",
  storeName: "chat_conversations",
});

const CHAT_CONVERSATIONS_KEY = "items";
let chatConversationWriteQueue: Promise<void> = Promise.resolve();

function normalizeImage(image: StoredChatImage): StoredChatImage {
  return {
    name: image.name || "image.png",
    type: image.type || "image/png",
    dataUrl: image.dataUrl,
  };
}

function normalizeMessage(message: ChatMessageItem & Record<string, unknown>): ChatMessageItem {
  const images = Array.isArray(message.images)
    ? message.images
        .filter((item): item is StoredChatImage => {
          if (!item || typeof item !== "object") {
            return false;
          }
          const candidate = item as StoredChatImage;
          return typeof candidate.dataUrl === "string" && candidate.dataUrl.length > 0;
        })
        .map(normalizeImage)
    : undefined;

  return {
    id: String(message.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || ""),
    images: images && images.length > 0 ? images : undefined,
    createdAt: String(message.createdAt || new Date().toISOString()),
    // Không lưu trạng thái pending qua các phiên: tin nhắn dở dang được coi là đã xong.
    error: typeof message.error === "string" ? message.error : undefined,
  };
}

function normalizeConversation(conversation: ChatConversation & Record<string, unknown>): ChatConversation {
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.map((message) => normalizeMessage(message as ChatMessageItem & Record<string, unknown>))
    : [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return {
    id: String(conversation.id || `${Date.now()}`),
    title: String(conversation.title || ""),
    model: typeof conversation.model === "string" && conversation.model ? conversation.model : "auto",
    reasoningEffort: typeof conversation.reasoningEffort === "string" ? conversation.reasoningEffort : "",
    createdAt: String(conversation.createdAt || lastMessage?.createdAt || new Date().toISOString()),
    updatedAt: String(conversation.updatedAt || lastMessage?.createdAt || new Date().toISOString()),
    messages,
  };
}

function sortChatConversations(conversations: ChatConversation[]): ChatConversation[] {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function getTimestamp(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function pickLatestConversation(current: ChatConversation, next: ChatConversation) {
  return getTimestamp(next.updatedAt) >= getTimestamp(current.updatedAt) ? next : current;
}

function queueChatConversationWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = chatConversationWriteQueue.then(operation);
  chatConversationWriteQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readStoredChatConversations(): Promise<ChatConversation[]> {
  const items =
    (await chatConversationStorage.getItem<Array<ChatConversation & Record<string, unknown>>>(
      CHAT_CONVERSATIONS_KEY,
    )) || [];
  return items.map(normalizeConversation);
}

export async function listChatConversations(): Promise<ChatConversation[]> {
  return sortChatConversations(await readStoredChatConversations());
}

export async function saveChatConversation(conversation: ChatConversation): Promise<void> {
  await queueChatConversationWrite(async () => {
    const items = await readStoredChatConversations();
    const nextConversation = normalizeConversation(conversation);
    const current = items.find((item) => item.id === nextConversation.id);
    const persistedConversation = current ? pickLatestConversation(current, nextConversation) : nextConversation;
    const nextItems = sortChatConversations([
      persistedConversation,
      ...items.filter((item) => item.id !== persistedConversation.id),
    ]);
    await chatConversationStorage.setItem(CHAT_CONVERSATIONS_KEY, nextItems);
  });
}

export async function renameChatConversation(id: string, title: string): Promise<void> {
  await queueChatConversationWrite(async () => {
    const items = await readStoredChatConversations();
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const updated = { ...target, title, updatedAt: new Date().toISOString() };
    const nextItems = sortChatConversations([updated, ...items.filter((item) => item.id !== id)]);
    await chatConversationStorage.setItem(CHAT_CONVERSATIONS_KEY, nextItems);
  });
}

export async function deleteChatConversation(id: string): Promise<void> {
  await queueChatConversationWrite(async () => {
    const items = await readStoredChatConversations();
    await chatConversationStorage.setItem(
      CHAT_CONVERSATIONS_KEY,
      items.filter((item) => item.id !== id),
    );
  });
}

export async function clearChatConversations(): Promise<void> {
  await queueChatConversationWrite(async () => {
    await chatConversationStorage.removeItem(CHAT_CONVERSATIONS_KEY);
  });
}
