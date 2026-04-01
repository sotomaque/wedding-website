"use client";

import dynamic from "next/dynamic";

const AIChatPanel = dynamic(
  () => import("@/components/ai-chat-panel").then((mod) => mod.AIChatPanel),
  { ssr: false },
);

export function LazyChatPanel() {
  return <AIChatPanel />;
}
