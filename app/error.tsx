"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-red-600">
          Something went wrong!
        </h1>
        <p className="text-gray-600 max-w-md">
          An unexpected error occurred. Please try refreshing the page or
          contact support if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
