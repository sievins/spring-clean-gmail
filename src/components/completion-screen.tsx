"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CompletionScreenProps {
  stats: {
    deleted: number;
    archived: number;
    unsubscribed: number;
  };
  mode: "delete" | "archive" | "unsubscribe";
  onStartOver: () => void;
}

export function CompletionScreen({
  stats,
  mode,
  onStartOver,
}: CompletionScreenProps) {
  const totalProcessed = stats.deleted + stats.archived + stats.unsubscribed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center rounded-lg border bg-gradient-to-b from-muted/30 to-muted/10 p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="text-6xl"
      >
        {totalProcessed > 0 ? "\ud83c\udf89" : "\u2728"}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-2xl font-bold"
      >
        {totalProcessed > 0 ? "Great job!" : "All clean!"}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-muted-foreground"
      >
        {totalProcessed > 0
          ? `You cleaned up ${totalProcessed} email${totalProcessed > 1 ? "s" : ""} this session.`
          : mode === "delete"
            ? "No more promotional emails to delete."
            : mode === "archive"
              ? "No more emails to archive."
              : "No more mailing lists to unsubscribe from."}
      </motion.p>

      {totalProcessed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex gap-4 text-sm"
        >
          {stats.deleted > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs text-destructive">
                {stats.deleted}
              </span>
              <span className="text-muted-foreground">deleted</span>
            </div>
          )}
          {stats.archived > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                {stats.archived}
              </span>
              <span className="text-muted-foreground">archived</span>
            </div>
          )}
          {stats.unsubscribed > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/10 text-xs text-orange-500">
                {stats.unsubscribed}
              </span>
              <span className="text-muted-foreground">unsubscribed</span>
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8"
      >
        <Button variant="outline" onClick={onStartOver}>
          Start Over
        </Button>
      </motion.div>
    </motion.div>
  );
}
