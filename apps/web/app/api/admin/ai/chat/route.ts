export const maxDuration = 60;

import { currentUser } from "@clerk/nextjs/server";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/ai/client";
import { type ChatStats, systemPrompt } from "@/lib/ai/prompts/chat";
import { createWeddingTools } from "@/lib/ai/tools/wedding-tools";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getRsvpStats } from "@/lib/db/admin/rsvp-stats";
import { getWeddingContext } from "@/lib/db/wedding-context";

const requestSchema = z.object({
  messages: z
    .array(
      z.looseObject({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.record(z.string(), z.unknown())),
      }),
    )
    .min(1, "At least one message is required"),
});

export async function GET() {
  try {
    const ctx = await getWeddingContext();
    const [auth, user] = await Promise.all([
      requireAdmin(ctx.weddingId),
      currentUser(),
    ]);
    if ("status" in auth) return auth;

    const adminEmail =
      user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "unknown";

    const messages = await db.chatMessage.findMany({
      where: {
        weddingId: ctx.weddingId,
        adminEmail,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in GET /api/admin/ai/chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const ctx = await getWeddingContext();
    const [auth, user] = await Promise.all([
      requireAdmin(ctx.weddingId),
      currentUser(),
    ]);
    if ("status" in auth) return auth;

    const adminEmail =
      user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "unknown";

    await db.chatMessage.deleteMany({
      where: {
        weddingId: ctx.weddingId,
        adminEmail,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/ai/chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getWeddingContext();
    const [auth, user] = await Promise.all([
      requireAdmin(ctx.weddingId),
      currentUser(),
    ]);
    if ("status" in auth) return auth;

    const adminEmail =
      user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "unknown";

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const modelMessages = await convertToModelMessages(
      // biome-ignore lint/suspicious/noExplicitAny: validated above, convertToModelMessages needs full UIMessage shape
      parsed.data.messages as any[],
    );
    const tools = createWeddingTools(ctx.weddingId);

    // Fetch stats snapshot in parallel (cheap queries, avoids tool call for
    // basic questions). RSVP counts come from the shared one-query aggregator.
    const [rsvp, giftAgg] = await Promise.all([
      getRsvpStats(ctx.weddingId),
      db.gift.aggregate({
        where: { weddingId: ctx.weddingId },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const stats: ChatStats = {
      totalGuests: rsvp.totalGuests,
      attending: rsvp.attending,
      declined: rsvp.declined,
      pending: rsvp.pending,
      totalGifts: giftAgg._count,
      totalGiftAmountCents: giftAgg._sum.amountCents ?? 0,
    };

    const system = systemPrompt(ctx, stats);

    // Save the latest user message (text only for clean history restoration)
    const lastUserMsg = parsed.data.messages.findLast((m) => m.role === "user");
    if (lastUserMsg) {
      const textPart = lastUserMsg.parts.find((p) => p.type === "text");
      const text =
        textPart && typeof textPart.text === "string" ? textPart.text : null;
      if (text) {
        await db.chatMessage.create({
          data: {
            weddingId: ctx.weddingId,
            adminEmail,
            role: "user",
            content: [{ type: "text", text }],
          },
        });
      }
    }

    const result = streamText({
      model: getModel(),
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
      temperature: 0.7,
      onFinish: async ({ text }) => {
        // Save the final assistant text response only (not intermediate tool calls).
        // This keeps history simple — restored messages are plain text that won't
        // cause MissingToolResultsError when sent back to the model.
        if (text) {
          await db.chatMessage.create({
            data: {
              weddingId: ctx.weddingId,
              adminEmail,
              role: "assistant",
              content: [{ type: "text", text }],
            },
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in POST /api/admin/ai/chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
