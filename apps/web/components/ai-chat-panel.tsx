"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  ClipboardCopy,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

const EXAMPLE_QUESTIONS = [
  "How many guests have RSVP'd?",
  "Who hasn't responded yet?",
  "Show me dietary restrictions",
  "Resend invite to [name]",
];

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyLoadedRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/admin/ai/chat" }),
    [],
  );

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport,
  });

  const isStreaming = status === "streaming";

  // Load chat history when panel first opens
  useEffect(() => {
    if (!open || historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    fetch("/api/admin/ai/chat")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          const restored: UIMessage[] = data.messages.map(
            (m: { id: string; role: string; content: unknown }) => ({
              id: m.id,
              role: m.role,
              parts: Array.isArray(m.content)
                ? m.content
                : [{ type: "text", text: String(m.content) }],
            }),
          );
          setMessages(restored);
        }
      })
      .catch(() => {
        // Silently fail — chat works fine without history
      });
  }, [open, setMessages]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    fetch("/api/admin/ai/chat", { method: "DELETE" }).catch(() => {});
  }, [setMessages]);

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  }

  function handleSuggestionClick(suggestion: string) {
    sendMessage({ text: suggestion });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-linear-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-200"
          size="icon"
          aria-label="Open AI Wedding Assistant"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[400px] sm:max-w-[400px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-linear-to-r from-purple-600/10 to-pink-500/10">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Wedding Assistant
              </SheetTitle>
              {visibleMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  disabled={isStreaming}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  New chat
                </Button>
              )}
            </div>
            <SheetDescription className="text-sm text-muted-foreground">
              Ask anything about your wedding planning
            </SheetDescription>
          </SheetHeader>

          {/* Messages area */}
          <Conversation className="flex-1">
            <ConversationContent className="gap-4 px-4 py-4">
              {visibleMessages.length === 0 ? (
                <ConversationEmptyState
                  icon={
                    <div className="rounded-full bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-4">
                      <MessageSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                  }
                  title="Welcome! How can I help?"
                  description="I can help you manage guests, track RSVPs, and plan your wedding."
                >
                  <div className="rounded-full bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-4">
                    <MessageSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">
                      Welcome! How can I help?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      I can help you manage guests, track RSVPs, and plan your
                      wedding.
                    </p>
                  </div>
                  <Suggestions className="flex-wrap justify-center gap-2">
                    {EXAMPLE_QUESTIONS.map((question) => (
                      <Suggestion
                        key={question}
                        suggestion={question}
                        onClick={handleSuggestionClick}
                        className="whitespace-normal text-left h-auto py-2"
                      />
                    ))}
                  </Suggestions>
                </ConversationEmptyState>
              ) : (
                <>
                  {visibleMessages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <Message key={message.id} from={message.role}>
                        <MessageContent
                          className={
                            isUser
                              ? "bg-linear-to-br from-purple-600 to-pink-500 text-white rounded-2xl"
                              : ""
                          }
                        >
                          {message.parts.map((part, i) => {
                            const key = `${message.id}-${i}`;
                            switch (part.type) {
                              case "text":
                                if (!part.text) return null;
                                if (isUser) {
                                  return (
                                    <p
                                      key={key}
                                      className="whitespace-pre-wrap"
                                    >
                                      {part.text}
                                    </p>
                                  );
                                }
                                return (
                                  <MessageResponse key={key}>
                                    {part.text}
                                  </MessageResponse>
                                );
                              default: {
                                // Handle tool parts (type is "tool-{name}" or "dynamic-tool")
                                if (
                                  !("state" in part) ||
                                  !("toolCallId" in part)
                                )
                                  return null;
                                // biome-ignore lint/suspicious/noExplicitAny: UIMessage tool part types are complex union — cast to ToolPart for rendering
                                const toolPart = part as any;
                                const toolName =
                                  toolPart.toolName ??
                                  toolPart.type.replace(/^tool-/, "");
                                return (
                                  <Tool
                                    key={key}
                                    defaultOpen={
                                      toolPart.state === "output-available"
                                    }
                                  >
                                    <ToolHeader
                                      type={toolPart.type}
                                      state={toolPart.state}
                                      toolName={toolName}
                                    />
                                    <ToolContent>
                                      {toolPart.input ? (
                                        <ToolInput input={toolPart.input} />
                                      ) : null}
                                      {toolPart.output ? (
                                        <ToolOutput
                                          output={toolPart.output}
                                          errorText={toolPart.errorText}
                                        />
                                      ) : null}
                                    </ToolContent>
                                  </Tool>
                                );
                              }
                            }
                          })}
                        </MessageContent>
                        {!isUser && (
                          <MessageActions>
                            <MessageAction
                              tooltip="Copy"
                              onClick={() => {
                                const text = message.parts
                                  .filter(
                                    (p): p is { type: "text"; text: string } =>
                                      p.type === "text" && "text" in p,
                                  )
                                  .map((p) => p.text)
                                  .join("");
                                copyToClipboard(text);
                              }}
                            >
                              <ClipboardCopy className="h-3.5 w-3.5" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    );
                  })}

                  {/* Loading indicator */}
                  {(status === "streaming" || status === "submitted") && (
                    <Message from="assistant">
                      <MessageContent>
                        <Shimmer>Thinking...</Shimmer>
                      </MessageContent>
                    </Message>
                  )}

                  {/* Error state */}
                  {status === "error" && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Something went wrong. Please try again.</span>
                    </div>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input area */}
          <div className="border-t bg-background p-4">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                ref={inputRef}
                placeholder="Ask about your wedding..."
                disabled={status === "submitted"}
              />
              <PromptInputSubmit
                status={status}
                onStop={isStreaming ? stop : undefined}
                className="bg-linear-to-br from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
              />
            </PromptInput>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
