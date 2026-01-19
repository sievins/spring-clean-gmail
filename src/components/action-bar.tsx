"use client";

import { Button } from "@/components/ui/button";
import { useEmails } from "@/components/email-context";

export function ActionBar() {
  const {
    selectedIds,
    deselectAll,
    processSelected,
    isProcessing,
    mode,
    startOver,
    stats,
    isComplete,
  } = useEmails();

  const hasSelection = selectedIds.size > 0;
  const hasActivity = stats.deleted > 0 || stats.archived > 0;

  // Don't show action bar if complete
  if (isComplete) {
    return null;
  }

  return (
    <div className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {mode === "delete"
            ? "Selected emails will be permanently deleted"
            : "Selected emails will be moved out of your inbox"}
        </p>
        <div className="flex gap-2">
          {hasActivity && (
            <Button variant="ghost" size="sm" onClick={startOver}>
              Start Over
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={deselectAll}
            disabled={!hasSelection || isProcessing}
          >
            Skip All
          </Button>
          {mode === "delete" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={processSelected}
              disabled={!hasSelection || isProcessing}
            >
              {isProcessing
                ? "Deleting..."
                : `Delete ${selectedIds.size} Selected`}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={processSelected}
              disabled={!hasSelection || isProcessing}
            >
              {isProcessing
                ? "Archiving..."
                : `Archive ${selectedIds.size} Selected`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
