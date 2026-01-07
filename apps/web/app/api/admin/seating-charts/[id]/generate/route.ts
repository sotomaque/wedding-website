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
 * POST /api/admin/seating-charts/[id]/generate
 * Generate AI seating suggestions
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
    const chart = await db
      .selectFrom("seating_charts")
      .selectAll()
      .where("id", "=", chartId)
      .executeTakeFirst();

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // Fetch tables for this chart
    const tables = await db
      .selectFrom("seating_tables")
      .selectAll()
      .where("seating_chart_id", "=", chartId)
      .orderBy("table_number", "asc")
      .execute();

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
    let guestQuery = db
      .selectFrom("guests")
      .select([
        "id",
        "first_name",
        "last_name",
        "side",
        "family",
        "bridal_party_role",
        "notes",
        "is_plus_one",
        "primary_guest_id",
        "invite_code",
        "party_id",
      ]);

    // Apply RSVP filter
    if (rsvpFilter === "confirmed") {
      guestQuery = guestQuery.where("rsvp_status", "=", "yes");
    }

    // Apply list filter
    if (listFilter === "a") {
      guestQuery = guestQuery.where("list", "=", "a");
    } else if (listFilter === "b") {
      guestQuery = guestQuery.where("list", "=", "b");
    } else if (listFilter === "c") {
      guestQuery = guestQuery.where("list", "=", "c");
    } else if (listFilter === "ab") {
      guestQuery = guestQuery.where("list", "in", ["a", "b"]);
    }
    // "abc" means all lists, no filter needed

    const guests = await guestQuery.execute();

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
      chart.default_seats_per_table,
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
    const tableNumberToId = new Map(tables.map((t) => [t.table_number, t.id]));

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
