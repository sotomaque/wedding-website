import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  buildSeatingPrompt,
  formatGuestForSeating,
} from "@/lib/ai/seating-prompt";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import type {
  AISeatingResponse,
  GuestListFilter,
  GuestRsvpFilter,
} from "@/lib/types/seating";

/**
 * Generate AI seating suggestions
 * @description Use OpenAI to generate intelligent seating assignments based on guest relationships, sides, and family groups
 * @pathParams IdParams
 * @body GenerateSeatingBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Seating
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, error } = await isAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: error === "Unauthorized" ? 401 : 403 },
      );
    }

    if (!env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const { id: chartId } = await params;

    // Parse filter from request body
    let listFilter: GuestListFilter = "abc";
    let rsvpFilter: GuestRsvpFilter = "confirmed";
    try {
      const body = await request.json();
      if (body.filter) {
        listFilter = body.filter.list || "abc";
        rsvpFilter = body.filter.rsvp || "confirmed";
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Fetch the chart
    const chart = await db.seatingChart.findUnique({
      where: { id: chartId },
    });

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // Fetch tables for this chart
    const tables = await db.seatingTable.findMany({
      where: { seatingChartId: chartId },
      orderBy: { tableNumber: "asc" },
    });

    if (tables.length === 0) {
      return NextResponse.json(
        {
          error:
            "No tables defined. Please add tables before generating seating.",
        },
        { status: 400 },
      );
    }

    // Build query for filtered guests
    const whereClause: Record<string, unknown> = {};

    // Apply RSVP filter
    if (rsvpFilter === "confirmed") {
      whereClause.rsvpStatus = "yes";
    }

    // Apply list filter
    if (listFilter === "a") {
      whereClause.list = "a";
    } else if (listFilter === "b") {
      whereClause.list = "b";
    } else if (listFilter === "c") {
      whereClause.list = "c";
    } else if (listFilter === "ab") {
      whereClause.list = { in: ["a", "b"] };
    }
    // "abc" means all lists, no filter needed

    const guests = await db.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        side: true,
        family: true,
        bridalPartyRole: true,
        notes: true,
        isPlusOne: true,
        primaryGuestId: true,
        inviteCode: true,
        partyId: true,
      },
    });

    if (guests.length === 0) {
      return NextResponse.json(
        {
          error:
            "No guests found matching the current filters. Try adjusting the list or RSVP filter.",
        },
        { status: 400 },
      );
    }

    // Format guests for AI
    const formattedGuests = guests.map(formatGuestForSeating);

    // Build prompt
    const prompt = buildSeatingPrompt(
      formattedGuests,
      tables.length,
      chart.defaultSeatsPerTable,
    );

    // Create OpenAI client
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Generate seating suggestions
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    // Parse the response
    let aiResponse: AISeatingResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      aiResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", result.text);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: result.text,
        },
        { status: 500 },
      );
    }

    // Map table numbers to table IDs
    const tableNumberToId = new Map(tables.map((t) => [t.tableNumber, t.id]));

    // Create a set of valid guest IDs from our query
    const validGuestIds = new Set(guests.map((g) => g.id));

    // Convert assignments to use table IDs and filter out invalid guest IDs
    // (AI sometimes hallucinates UUIDs that don't exist in the database)
    const assignmentsWithTableIds = aiResponse.assignments.map((a) => ({
      ...a,
      tableId: tableNumberToId.get(a.tableNumber),
      // Filter guestIds to only include valid ones from our query
      guestIds: a.guestIds.filter((guestId) => validGuestIds.has(guestId)),
    }));

    // Count how many guest IDs were filtered out
    const originalGuestIdCount = aiResponse.assignments.reduce(
      (sum, a) => sum + a.guestIds.length,
      0,
    );
    const validGuestIdCount = assignmentsWithTableIds.reduce(
      (sum, a) => sum + a.guestIds.length,
      0,
    );
    const invalidCount = originalGuestIdCount - validGuestIdCount;

    if (invalidCount > 0) {
      console.warn(
        `AI generated ${invalidCount} invalid guest IDs that were filtered out`,
      );
    }

    return NextResponse.json({
      success: true,
      assignments: assignmentsWithTableIds,
      summary: aiResponse.summary,
      guestCount: guests.length,
      tableCount: tables.length,
      assignedCount: validGuestIdCount,
      skippedInvalidIds: invalidCount,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/admin/seating-charts/[id]/generate:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
