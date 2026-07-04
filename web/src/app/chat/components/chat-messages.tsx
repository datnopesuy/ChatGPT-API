"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import type { ChatMessageItem } from "@/store/chat-conversations";

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ className, ...props }) => (
          <a
            className={cn(
              "font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:decoration-blue-700",
              className,
            )}
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        h1: ({ className, ...props }) => <h1 className={cn("mt-6 mb-3 text-xl font-semibold tracking-tight text-stone-950 first:mt-0 dark:text-stone-50", className)} {...props} />,
        h2: ({ className, ...props }) => <h2 className={cn("mt-6 mb-3 text-lg font-semibold tracking-tight text-stone-950 first:mt-0 dark:text-stone-50", className)} {...props} />,
        h3: ({ className, ...props }) => <h3 className={cn("mt-5 mb-2 text-base font-semibold text-stone-900 dark:text-stone-100", className)} {...props} />,
        p: ({ className, ...props }) => <p className={cn("my-3 leading-7 text-stone-800 dark:text-stone-200", className)} {...props} />,
        ul: ({ className, ...props }) => <ul className={cn("my-3 list-disc space-y-1.5 pl-6 leading-7 text-stone-800 dark:text-stone-200", className)} {...props} />,
        ol: ({ className, ...props }) => <ol className={cn("my-3 list-decimal space-y-1.5 pl-6 leading-7 text-stone-800 dark:text-stone-200", className)} {...props} />,
        blockquote: ({ className, ...props }) => <blockquote className={cn("my-4 border-l-4 border-stone-300 bg-white/70 py-2 pr-4 pl-5 text-stone-700 dark:border-white/20 dark:bg-white/[0.04] dark:text-stone-300", className)} {...props} />,
        code: ({ className, ...props }) => <code className={cn("rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em] text-stone-800 dark:bg-white/10 dark:text-stone-100", className)} {...props} />,
        pre: ({ className, ...props }) => <pre className={cn("my-4 overflow-x-auto rounded-xl border border-stone-200 bg-stone-950 p-4 text-sm text-stone-50 dark:border-white/10", className)} {...props} />,
        table: ({ className, ...props }) => (
          <div className="my-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-white/10">
            <table className={cn("w-full border-collapse text-sm", className)} {...props} />
          </div>
        ),
        th: ({ className, ...props }) => <th className={cn("border-b border-stone-200 bg-stone-100 px-3 py-2 text-left font-semibold dark:border-white/10 dark:bg-white/10", className)} {...props} />,
        td: ({ className, ...props }) => <td className={cn("border-b border-stone-100 px-3 py-2 align-top dark:border-white/10", className)} {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

type ChatMessagesProps = {
  messages: ChatMessageItem[];
  isEmpty: boolean;
};

export function ChatMessages({ messages, isEmpty }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-stone-400 dark:text-stone-500">
        <p className="text-base font-medium text-stone-500 dark:text-stone-400">Bắt đầu một cuộc trò chuyện</p>
        <p className="max-w-sm text-sm leading-6">
          Nhập câu hỏi bên dưới để trò chuyện với ChatGPT. Có thể dùng cho hỏi đáp TOEIC,
          giải thích ngữ pháp, dịch thuật và nhiều tác vụ văn bản khác.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div key={message.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
            <div className="px-1 text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
              {isUser ? "Bạn" : "Trợ lý"}
            </div>
            {message.images && message.images.length > 0 ? (
              <div className={cn("flex flex-wrap gap-2", isUser ? "justify-end" : "justify-start")}>
                {message.images.map((image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${message.id}-img-${index}`}
                    src={image.dataUrl}
                    alt={image.name}
                    className="h-28 w-28 rounded-lg border border-stone-200 object-cover dark:border-white/10"
                  />
                ))}
              </div>
            ) : null}
            <div
              className={cn(
                "max-w-full rounded-2xl px-4 py-2.5 text-sm",
                isUser
                  ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950"
                  : "border border-stone-200/70 bg-white/70 text-stone-800 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-200",
              )}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap leading-7">{message.content}</div>
              ) : message.content ? (
                <div className="min-w-0">
                  <MarkdownContent content={message.content} />
                </div>
              ) : message.pending ? (
                <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang soạn trả lời...
                </div>
              ) : null}
              {message.error ? (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                  {message.error}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
