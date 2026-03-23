"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useState } from "react";

const EXAMPLE_REQUESTS: {
  label: string;
  method: string;
  path: string;
  body?: string;
  description: string;
}[] = [
  {
    label: "Health Check",
    method: "GET",
    path: "/api/health",
    description: "Verify the API is running",
  },
  {
    label: "List Public Photos",
    method: "GET",
    path: "/api/photos",
    description: "Fetch all active public photos",
  },
  {
    label: "Verify Invite Code",
    method: "GET",
    path: "/api/rsvp/verify?code=TEST-CODE",
    description: "Check if an invite code is valid",
  },
  {
    label: "Submit RSVP",
    method: "POST",
    path: "/api/rsvp/submit",
    body: JSON.stringify(
      {
        inviteCode: "TEST-CODE",
        attending: true,
        dietaryRestrictions: "Vegetarian",
      },
      null,
      2,
    ),
    description: "Submit an RSVP response",
  },
  {
    label: "List Guests (Admin)",
    method: "GET",
    path: "/api/admin/guests",
    description: "Fetch all guests (requires admin auth)",
  },
  {
    label: "Create Guest (Admin)",
    method: "POST",
    path: "/api/admin/guests",
    body: JSON.stringify(
      {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        side: "bride",
        list: "a",
        plusOneAllowed: true,
        plusOneFirstName: "John",
        plusOneLastName: "Doe",
        sendEmail: false,
        family: false,
        under21: false,
        threeAndUnder: false,
      },
      null,
      2,
    ),
    description: "Create a new guest with optional plus-one",
  },
  {
    label: "List Events (Admin)",
    method: "GET",
    path: "/api/admin/events",
    description: "Fetch all events with RSVP counts",
  },
  {
    label: "Create Event (Admin)",
    method: "POST",
    path: "/api/admin/events",
    body: JSON.stringify(
      {
        name: "Welcome Dinner",
        description: "Casual dinner the night before",
        eventDate: "2026-06-14",
        startTime: "18:00",
        endTime: "21:00",
        locationName: "Restaurant Name",
        locationAddress: "123 Main St",
        isDefault: false,
      },
      null,
      2,
    ),
    description: "Create a new wedding event",
  },
  {
    label: "List Gifts (Admin)",
    method: "GET",
    path: "/api/admin/gifts",
    description: "Fetch all gifts with totals",
  },
  {
    label: "Create Photo (Admin)",
    method: "POST",
    path: "/api/admin/photos",
    body: JSON.stringify(
      {
        url: "https://example.com/photo.jpg",
        alt: "Wedding photo description",
        description: "A beautiful moment captured",
      },
      null,
      2,
    ),
    description: "Add a new photo to the gallery",
  },
];

function QuickTestPanel() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeBody, setActiveBody] = useState<string>(
    EXAMPLE_REQUESTS[0]?.body || "",
  );

  const example = EXAMPLE_REQUESTS[selectedExample];

  async function handleSend() {
    if (!example) return;
    setLoading(true);
    setResponse(null);

    try {
      const options: RequestInit = {
        method: example.method,
        headers: { "Content-Type": "application/json" },
      };

      const bodyToSend = activeBody || example.body;
      if (example.method !== "GET" && bodyToSend) {
        options.body = bodyToSend;
      }

      const res = await fetch(example.path, options);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectExample(index: number) {
    setSelectedExample(index);
    const ex = EXAMPLE_REQUESTS[index];
    setActiveBody(ex?.body || "");
    setResponse(null);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Quick API Tester</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Send example requests to your local API endpoints for manual testing.
        Admin endpoints require authentication via Clerk.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Example selection and request */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="example-select"
              className="block text-sm font-medium mb-2"
            >
              Select Example Request
            </label>
            <select
              id="example-select"
              value={selectedExample}
              onChange={(e) => handleSelectExample(Number(e.target.value))}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            >
              {EXAMPLE_REQUESTS.map((ex, i) => (
                <option key={`${ex.method}-${ex.path}`} value={i}>
                  {ex.method} - {ex.label}
                </option>
              ))}
            </select>
          </div>

          {example && (
            <>
              <p className="text-sm text-muted-foreground">
                {example.description}
              </p>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-bold rounded ${
                    example.method === "GET"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : example.method === "POST"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : example.method === "PATCH"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {example.method}
                </span>
                <code className="text-sm bg-secondary px-2 py-1 rounded flex-1 overflow-x-auto">
                  {example.path}
                </code>
              </div>

              {example.body && (
                <div>
                  <label
                    htmlFor="request-body"
                    className="block text-sm font-medium mb-1"
                  >
                    Request Body (editable)
                  </label>
                  <textarea
                    id="request-body"
                    value={activeBody}
                    onChange={(e) => setActiveBody(e.target.value)}
                    className="w-full h-48 p-3 font-mono text-sm border border-border rounded-md bg-secondary text-foreground resize-y"
                    spellCheck={false}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {loading ? "Sending..." : `Send ${example.method} Request`}
              </button>
            </>
          )}
        </div>

        {/* Right: Response */}
        <div>
          <h3 className="text-sm font-medium mb-2">Response</h3>
          <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
            {response || "Send a request to see the response here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function SwaggerUIClient({ specUrl }: { specUrl: string }) {
  return (
    <div>
      <QuickTestPanel />
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <SwaggerUI url={specUrl} />
      </div>
    </div>
  );
}
