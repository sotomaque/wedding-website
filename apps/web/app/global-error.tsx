"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must render its own <html> and <body> since the root layout may have crashed.
 * app/error.tsx handles errors within pages; this handles everything else.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <AlertTriangle size={32} color="#dc2626" />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              margin: "0 0 8px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#78716c",
              margin: "0 0 24px",
            }}
          >
            A critical error occurred. You can try again or return to the
            homepage.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: "none",
                backgroundColor: "#1c1917",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid #d6d3d1",
                backgroundColor: "transparent",
                color: "#1c1917",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Go home
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#a8a29e",
                marginTop: 24,
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
