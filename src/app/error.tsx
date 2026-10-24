"use client";

import { ErrorState } from "@/components/states/error-state";

export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorState
      message={
        error instanceof Error
          ? error.message
          : "An unexpected error occurred."
      }
      retry={retry}
    />
  );
}
