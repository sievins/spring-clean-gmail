"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailRow } from "@/components/email-row";
import { EmailListSkeleton } from "@/components/email-skeleton";
import { CompletionScreen } from "@/components/completion-screen";
import { useEmails } from "@/components/email-context";

export function AnimatedEmailList() {
  const {
    currentBatch,
    selectedIds,
    isLoading,
    error,
    selectAll,
    deselectAll,
    toggleSelection,
    isComplete,
    stats,
    mode,
    startOver,
  } = useEmails();

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-12 text-center">
        <h3 className="text-lg font-medium text-destructive">
          Failed to load emails
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <CompletionScreen stats={stats} mode={mode} onStartOver={startOver} />
    );
  }

  if (currentBatch.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <div className="text-4xl">
          {mode === "delete" ? "\u2728" : "\ud83d\udce5"}
        </div>
        <h3 className="mt-4 text-lg font-medium">No emails to {mode}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "delete"
            ? "No promotional or outdated emails found. Your inbox is looking clean!"
            : "No emails need archiving right now. Check back later."}
        </p>
      </div>
    );
  }

  const allSelected =
    currentBatch.length > 0 && selectedIds.size === currentBatch.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < currentBatch.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll();
    } else {
      deselectAll();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <Checkbox
          id="select-all"
          checked={allSelected}
          ref={(el) => {
            if (el) {
              (el as unknown as HTMLInputElement).indeterminate = someSelected;
            }
          }}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
        />
        <label htmlFor="select-all" className="text-sm font-medium">
          {selectedIds.size === 0
            ? "Select all"
            : `${selectedIds.size} of ${currentBatch.length} selected`}
        </label>
        {(stats.deleted > 0 || stats.archived > 0) && (
          <span className="ml-auto text-xs text-muted-foreground">
            Session: {stats.deleted > 0 && `${stats.deleted} deleted`}
            {stats.deleted > 0 && stats.archived > 0 && ", "}
            {stats.archived > 0 && `${stats.archived} archived`}
          </span>
        )}
      </div>

      <div className="overflow-hidden" role="list">
        <AnimatePresence mode="popLayout" initial={false}>
          {currentBatch.map((email, index) => (
            <motion.div
              key={email.id}
              layout
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
                delay: index * 0.03,
              }}
            >
              <EmailRow
                email={email}
                selected={selectedIds.has(email.id)}
                onSelectionChange={(selected) =>
                  toggleSelection(email.id, selected)
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
