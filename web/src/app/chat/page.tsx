"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, LoaderCircle, Send, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CHAT_TEXT_MODEL,
  fetchTextModels,
  streamChatCompletion,
  type ChatStreamMessage,
} from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { cn } from "@/lib/utils";
import {
  clearChatConversations,
  deleteChatConversation,
  listChatConversations,
  renameChatConversation,
  saveChatConversation,
  type ChatConversation,
  type ChatMessageItem,
  type StoredChatImage,
} from "@/store/chat-conversations";

import { ChatMessages } from "./components/chat-messages";
import { ChatSidebar } from "./components/chat-sidebar";

const ACTIVE_CONVERSATION_STORAGE_KEY = "chatgpt2api:chat_active_conversation_id";
const CHAT_MODEL_STORAGE_KEY = "chatgpt2api:chat_last_model";
const CHAT_EFFORT_STORAGE_KEY = "chatgpt2api:chat_last_effort";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 4;

const REASONING_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "xhigh", label: "Siêu cao" },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildConversationTitle(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "Cuộc trò chuyện mới";
  }
  return trimmed.length <= 24 ? trimmed : `${trimmed.slice(0, 24)}...`;
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readImage(file: File): Promise<StoredChatImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name} không phải là tệp ảnh`));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`${file.name} vượt quá 10MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (!url.startsWith("data:image/")) {
        reject(new Error(`Không đọc được ${file.name}`));
        return;
      }
      resolve({ name: file.name, type: file.type, dataUrl: url });
    };
    reader.onerror = () => reject(reader.error || new Error(`Không đọc được ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// Chuyển lịch sử tin nhắn sang định dạng messages của /v1/chat/completions.
function toStreamMessages(messages: ChatMessageItem[]): ChatStreamMessage[] {
  return messages
    .filter((message) => message.content.trim() || (message.images && message.images.length > 0))
    .map((message) => {
      if (message.role === "user" && message.images && message.images.length > 0) {
        return {
          role: "user" as const,
          content: [
            ...(message.content.trim() ? [{ type: "text" as const, text: message.content }] : []),
            ...message.images.map((image) => ({
              type: "image_url" as const,
              image_url: { url: image.dataUrl },
            })),
          ],
        };
      }
      return { role: message.role, content: message.content };
    });
}

export default function ChatPage() {
  const { isCheckingAuth, session } = useAuthGuard();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([DEFAULT_CHAT_TEXT_MODEL]);
  const [model, setModel] = useState(DEFAULT_CHAT_TEXT_MODEL);
  const [reasoningEffort, setReasoningEffort] = useState("");
  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<StoredChatImage[]>([]);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId],
  );

  // Tải danh sách model văn bản.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await fetchTextModels();
        if (!active) return;
        setModels(list.length > 0 ? list : [DEFAULT_CHAT_TEXT_MODEL]);
      } catch {
        if (active) setModels([DEFAULT_CHAT_TEXT_MODEL]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Khôi phục lựa chọn model/effort đã lưu.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedModel = window.localStorage.getItem(CHAT_MODEL_STORAGE_KEY);
    const savedEffort = window.localStorage.getItem(CHAT_EFFORT_STORAGE_KEY);
    if (savedModel && savedModel !== "auto") setModel(savedModel);
    if (savedEffort) setReasoningEffort(savedEffort);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_MODEL_STORAGE_KEY, model);
    }
  }, [model]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_EFFORT_STORAGE_KEY, reasoningEffort);
    }
  }, [reasoningEffort]);

  // Tải lịch sử hội thoại từ localforage.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const items = await listChatConversations();
        if (!active) return;
        setConversations(items);
        const savedActive =
          typeof window !== "undefined"
            ? window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY)
            : null;
        if (savedActive && items.some((item) => item.id === savedActive)) {
          setActiveId(savedActive);
        } else if (items.length > 0) {
          setActiveId(items[0].id);
        }
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !activeId) return;
    window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeId);
  }, [activeId]);

  const persist = useCallback((conversation: ChatConversation) => {
    setConversations((current) => {
      const rest = current.filter((item) => item.id !== conversation.id);
      return [conversation, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    void saveChatConversation(conversation);
  }, []);

  const handleImagesChange = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const images = await Promise.all(Array.from(files).map(readImage));
      setSelectedImages((current) => [...current, ...images].slice(0, MAX_IMAGES));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const createDraft = useCallback(() => {
    setActiveId(null);
    setSelectedImages([]);
    setInput("");
    setHistoryOpen(false);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && selectedImages.length === 0) || sending) {
      return;
    }

    const now = new Date().toISOString();
    const userMessage: ChatMessageItem = {
      id: createId(),
      role: "user",
      content: text,
      images: selectedImages.length > 0 ? selectedImages : undefined,
      createdAt: now,
    };
    const assistantMessage: ChatMessageItem = {
      id: createId(),
      role: "assistant",
      content: "",
      createdAt: now,
      pending: true,
    };

    const base: ChatConversation = activeConversation
      ? { ...activeConversation, updatedAt: now }
      : {
          id: createId(),
          title: buildConversationTitle(text || "Ảnh"),
          model,
          reasoningEffort,
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

    const conversation: ChatConversation = {
      ...base,
      model,
      reasoningEffort,
      updatedAt: now,
      messages: [...base.messages, userMessage, assistantMessage],
    };

    setActiveId(conversation.id);
    setConversations((current) => {
      const rest = current.filter((item) => item.id !== conversation.id);
      return [conversation, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    setInput("");
    setSelectedImages([]);
    setSending(true);

    const streamMessages = toStreamMessages([...base.messages, userMessage]);
    const controller = new AbortController();
    abortRef.current = controller;

    const updateAssistant = (patch: Partial<ChatMessageItem>) => {
      setConversations((current) =>
        current.map((item) => {
          if (item.id !== conversation.id) return item;
          return {
            ...item,
            updatedAt: new Date().toISOString(),
            messages: item.messages.map((message) =>
              message.id === assistantMessage.id ? { ...message, ...patch } : message,
            ),
          };
        }),
      );
    };

    let accumulated = "";
    try {
      await streamChatCompletion({
        model,
        messages: streamMessages,
        reasoningEffort: reasoningEffort || undefined,
        signal: controller.signal,
        onDelta: (delta) => {
          accumulated += delta;
          updateAssistant({ content: accumulated, pending: true });
        },
      });
      updateAssistant({ content: accumulated, pending: false, error: undefined });
    } catch (err) {
      const aborted = controller.signal.aborted;
      const message = err instanceof Error ? err.message : String(err);
      updateAssistant({
        content: accumulated,
        pending: false,
        error: aborted ? undefined : message,
      });
      if (!aborted) {
        toast.error(message);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
      // Lưu bản cuối cùng của hội thoại.
      setConversations((current) => {
        const target = current.find((item) => item.id === conversation.id);
        if (target) {
          void saveChatConversation(target);
        }
        return current;
      });
    }
  }, [activeConversation, input, model, reasoningEffort, selectedImages, sending]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteChatConversation(id);
      setConversations((current) => {
        const next = current.filter((item) => item.id !== id);
        if (id === activeId) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId],
  );

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    await renameChatConversation(id, title);
    setConversations((current) =>
      current.map((item) => (item.id === id ? { ...item, title } : item)),
    );
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearChatConversations();
    setConversations([]);
    setActiveId(null);
  }, []);

  if (isCheckingAuth || !session) {
    return (
      <div className="flex min-h-[calc(100vh-49px)] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const sidebar = (
    <ChatSidebar
      conversations={conversations}
      isLoadingHistory={isLoadingHistory}
      selectedConversationId={activeId}
      onCreateDraft={createDraft}
      onClearHistory={handleClearHistory}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onRenameConversation={handleRenameConversation}
      formatConversationTime={formatConversationTime}
    />
  );

  return (
    <div className="mx-auto grid h-[calc(100vh-49px)] w-full max-w-[1600px] grid-cols-1 gap-0 px-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6">
      <aside className="hidden min-h-0 border-r border-stone-200/70 py-4 lg:block dark:border-white/10">
        {sidebar}
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-stone-200/70 px-4 py-3 dark:border-white/10">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 lg:hidden dark:text-stone-300 dark:hover:bg-white/10">
              <History className="size-4" />
              <span className="sr-only">Lịch sử trò chuyện</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <SheetHeader>
                <SheetTitle>Lịch sử trò chuyện</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-64px)] px-3 pb-3">{sidebar}</div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg border-stone-200/70 bg-transparent text-sm shadow-none dark:border-white/10">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={reasoningEffort || "default"}
              onValueChange={(value) => setReasoningEffort(value === "default" ? "" : value)}
            >
              <SelectTrigger className="h-9 w-[130px] rounded-lg border-stone-200/70 bg-transparent text-sm shadow-none dark:border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-stone-200 bg-white/85 text-stone-600 hover:bg-white dark:border-white/10"
            onClick={createDraft}
          >
            Cuộc trò chuyện mới
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <ChatMessages
            messages={activeConversation?.messages || []}
            isEmpty={(activeConversation?.messages.length || 0) === 0}
          />
        </div>

        <div className="border-t border-stone-200/70 px-4 py-3 dark:border-white/10">
          {selectedImages.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedImages.map((image, index) => (
                <div
                  key={`${image.name}-${index}`}
                  className="group relative size-16 overflow-hidden rounded-lg border border-stone-200 dark:border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.dataUrl} alt={image.name} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Bỏ ${image.name}`}
                    onClick={() =>
                      setSelectedImages((current) => current.filter((_, i) => i !== index))
                    }
                    className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-md bg-white/90 text-stone-700 dark:bg-stone-950/90 dark:text-stone-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 dark:border-white/10 dark:bg-stone-950/80">
            <label
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/10"
              title="Thêm ảnh"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void handleImagesChange(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Nhập câu hỏi (Enter để gửi, Shift+Enter để xuống dòng)"
              className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent p-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
              rows={1}
            />
            {sending ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0 rounded-lg"
                onClick={stopStreaming}
              >
                <Square className="size-4" />
                Dừng
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-lg bg-stone-950 text-white hover:bg-stone-800"
                onClick={() => void sendMessage()}
                disabled={!input.trim() && selectedImages.length === 0}
              >
                <Send className="size-4" />
                Gửi
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
