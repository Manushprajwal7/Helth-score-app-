"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-red-600">
              Something went wrong!
            </h1>
            <p className="text-gray-600 max-w-md">
              An unexpected error occurred. Please try refreshing the page or
              contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
