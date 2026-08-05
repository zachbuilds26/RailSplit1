"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888" }}>
            RailSplit
          </p>
          <h1 style={{ fontSize: 26, margin: "12px 0 0", letterSpacing: "-0.03em" }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#888", margin: "12px 0 0" }}>
            The page hit an unexpected error. Try again, and if it keeps happening, come back in a
            moment.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, lineHeight: 1.5, color: "#555", margin: "10px 0 0" }}>
              Error reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
