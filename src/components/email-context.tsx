"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import type { EmailWithClassification } from "@/types/email";

const BATCH_SIZE = 10;

// Remove zero-width spaces and other invisible characters Gmail adds
function cleanSnippet(snippet: string): string {
  return snippet.replace(/[\u034F\u200B-\u200D\uFEFF\u00A0]+/g, "").trim();
}

interface SessionStats {
  deleted: number;
  archived: number;
  unsubscribed: number;
}

interface EmailContextValue {
  // Current batch
  currentBatch: EmailWithClassification[];
  selectedIds: Set<string>;

  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  error: Error | null;

  // Actions
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (emailId: string, selected: boolean) => void;
  processSelected: () => Promise<void>;
  skipBatch: () => void;
  startOver: () => void;

  // Session state
  stats: SessionStats;
  isComplete: boolean;
  mode: "delete" | "archive" | "unsubscribe";
}

const EmailContext = createContext<EmailContextValue | null>(null);

interface EmailProviderProps {
  children: ReactNode;
  mode: "delete" | "archive" | "unsubscribe";
}

export function EmailProvider({ children, mode }: EmailProviderProps) {
  // Session state
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [skippedSenders, setSkippedSenders] = useState<Set<string>>(new Set()); // For unsubscribe mode
  const [stats, setStats] = useState<SessionStats>({ deleted: 0, archived: 0, unsubscribed: 0 });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pre-loaded emails buffer
  const [emailBuffer, setEmailBuffer] = useState<EmailWithClassification[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMoreEmails, setHasMoreEmails] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const utils = trpc.useUtils();

  // Initial fetch
  const {
    data,
    isLoading: isInitialLoading,
    error,
  } = trpc.emails.list.useQuery(
    { mode },
    {
      refetchOnWindowFocus: false,
      enabled: !isInitialized,
    },
  );

  // Pre-fetch more emails when buffer runs low
  const prefetchQuery = trpc.emails.list.useQuery(
    { mode, pageToken: nextPageToken },
    {
      enabled: !!nextPageToken && emailBuffer.length < BATCH_SIZE * 2,
      refetchOnWindowFocus: false,
    },
  );

  // Track which data we've already processed (use state, not refs)
  const [lastProcessedDataKey, setLastProcessedDataKey] = useState<
    string | null
  >(null);
  const [lastProcessedPrefetchKey, setLastProcessedPrefetchKey] = useState<
    string | null
  >(null);

  // Derive keys for current data
  const dataKey = data?.emails.map((e) => e.id).join(",") ?? null;
  const prefetchKey =
    prefetchQuery.data?.emails.map((e) => e.id).join(",") ?? null;

  // Initialize buffer from initial fetch (runs during render when data key changes)
  if (data && !isInitialized && dataKey && dataKey !== lastProcessedDataKey) {
    setLastProcessedDataKey(dataKey);
    const filteredEmails = data.emails
      .filter((e) =>
        !processedIds.has(e.id) &&
        !skippedIds.has(e.id) &&
        !(mode === "unsubscribe" && skippedSenders.has(e.from.email.toLowerCase()))
      )
      .map((e) => ({ ...e, snippet: cleanSnippet(e.snippet) }));
    setEmailBuffer(filteredEmails);
    setNextPageToken(data.nextPageToken);
    setHasMoreEmails(!!data.nextPageToken || filteredEmails.length > 0);
    setIsInitialized(true);

    // Auto-select first batch
    const firstBatch = filteredEmails.slice(0, BATCH_SIZE);
    setSelectedIds(new Set(firstBatch.map((e) => e.id)));
  }

  // Add prefetched emails to buffer (runs during render when prefetch key changes)
  if (
    prefetchQuery.data &&
    prefetchQuery.data.emails.length > 0 &&
    prefetchKey &&
    prefetchKey !== lastProcessedPrefetchKey
  ) {
    setLastProcessedPrefetchKey(prefetchKey);
    const prefetchedEmails = prefetchQuery.data.emails
      .filter((e) =>
        !processedIds.has(e.id) &&
        !skippedIds.has(e.id) &&
        !(mode === "unsubscribe" && skippedSenders.has(e.from.email.toLowerCase()))
      )
      .map((e) => ({ ...e, snippet: cleanSnippet(e.snippet) }));
    if (prefetchedEmails.length > 0) {
      // Use functional update to avoid race conditions with skipBatch
      setEmailBuffer((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newEmails = prefetchedEmails.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newEmails];
      });
    }
    if (prefetchQuery.data.nextPageToken) {
      setNextPageToken(prefetchQuery.data.nextPageToken);
    } else {
      setHasMoreEmails(false);
    }
  }

  // Current batch is the first BATCH_SIZE emails from buffer
  const currentBatch = useMemo(() => {
    return emailBuffer.slice(0, BATCH_SIZE);
  }, [emailBuffer]);

  // Check if complete (no more emails)
  const isComplete = useMemo(() => {
    return isInitialized && currentBatch.length === 0 && !hasMoreEmails;
  }, [isInitialized, currentBatch.length, hasMoreEmails]);

  // Mutations
  const deleteMutation = trpc.emails.delete.useMutation();
  const archiveMutation = trpc.emails.archive.useMutation();
  const unsubscribeMutation = trpc.emails.unsubscribe.useMutation();

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(currentBatch.map((e) => e.id)));
  }, [currentBatch]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((emailId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(emailId);
      } else {
        next.delete(emailId);
      }
      return next;
    });
  }, []);

  const skipBatch = useCallback(() => {
    if (currentBatch.length === 0) return;

    // Mark all current batch emails as skipped
    const currentBatchIds = new Set(currentBatch.map((e) => e.id));

    // In unsubscribe mode, also track skipped senders to filter out all their emails
    let remaining = emailBuffer.filter((e) => !currentBatchIds.has(e.id));
    if (mode === "unsubscribe") {
      const sendersToSkip = new Set(currentBatch.map((e) => e.from.email.toLowerCase()));
      remaining = remaining.filter((e) => !sendersToSkip.has(e.from.email.toLowerCase()));
      setSkippedSenders((prev) => {
        const next = new Set(prev);
        sendersToSkip.forEach((sender) => next.add(sender));
        return next;
      });
    }

    const nextBatchIds = remaining.slice(0, BATCH_SIZE).map((e) => e.id);

    setSkippedIds((prev) => {
      const next = new Set(prev);
      currentBatchIds.forEach((id) => next.add(id));
      return next;
    });
    setEmailBuffer(remaining);
    setSelectedIds(new Set(nextBatchIds));
  }, [currentBatch, emailBuffer, mode]);

  const processSelected = useCallback(async () => {
    const selectedList = Array.from(selectedIds);
    if (selectedList.length === 0) return;

    // Get skipped emails (in current batch but not selected)
    const currentBatchIds = new Set(currentBatch.map((e) => e.id));
    const skippedEmails = currentBatch.filter((e) => !selectedIds.has(e.id));
    const newSkipped = skippedEmails.map((e) => e.id);

    // Optimistically update UI
    const previousBuffer = [...emailBuffer];
    const previousProcessed = new Set(processedIds);
    const previousSkipped = new Set(skippedIds);
    const previousSkippedSenders = new Set(skippedSenders);
    const previousStats = { ...stats };

    // In unsubscribe mode, track skipped senders and filter out all their emails
    let remaining = emailBuffer.filter((e) => !currentBatchIds.has(e.id));
    if (mode === "unsubscribe" && skippedEmails.length > 0) {
      const sendersToSkip = new Set(skippedEmails.map((e) => e.from.email.toLowerCase()));
      remaining = remaining.filter((e) => !sendersToSkip.has(e.from.email.toLowerCase()));
      setSkippedSenders((prev) => {
        const next = new Set(prev);
        sendersToSkip.forEach((sender) => next.add(sender));
        return next;
      });
    }

    const nextBatchIds = remaining.slice(0, BATCH_SIZE).map((e) => e.id);

    // Update state optimistically
    setProcessedIds((prev) => {
      const next = new Set(prev);
      selectedList.forEach((id) => next.add(id));
      return next;
    });
    setSkippedIds((prev) => {
      const next = new Set(prev);
      newSkipped.forEach((id) => next.add(id));
      return next;
    });
    setEmailBuffer(remaining);

    const statKey = mode === "delete" ? "deleted" : mode === "archive" ? "archived" : "unsubscribed";
    setStats((prev) => ({
      ...prev,
      [statKey]: prev[statKey] + selectedList.length,
    }));

    // Auto-select next batch immediately
    setSelectedIds(new Set(nextBatchIds));

    try {
      // Call API
      if (mode === "delete") {
        await deleteMutation.mutateAsync({ emailIds: selectedList });
      } else if (mode === "archive") {
        await archiveMutation.mutateAsync({ emailIds: selectedList });
      } else {
        // Unsubscribe mode - need to pass email data with unsubscribe headers
        const selectedEmails = currentBatch
          .filter((e) => selectedIds.has(e.id) && e.listUnsubscribe)
          .map((e) => ({
            id: e.id,
            listUnsubscribe: e.listUnsubscribe!,
            listUnsubscribePost: e.listUnsubscribePost,
          }));
        await unsubscribeMutation.mutateAsync({ emails: selectedEmails });
      }

      const actionText = mode === "delete" ? "Deleted" : mode === "archive" ? "Archived" : "Unsubscribed from";
      toast.success(
        `${actionText} ${selectedList.length} email${selectedList.length > 1 ? "s" : ""}`,
      );
    } catch (err) {
      // Revert on error
      setEmailBuffer(previousBuffer);
      setProcessedIds(previousProcessed);
      setSkippedIds(previousSkipped);
      setSkippedSenders(previousSkippedSenders);
      setStats(previousStats);

      toast.error(
        `Failed to ${mode}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }, [
    selectedIds,
    currentBatch,
    emailBuffer,
    processedIds,
    skippedIds,
    skippedSenders,
    stats,
    mode,
    deleteMutation,
    archiveMutation,
    unsubscribeMutation,
  ]);

  const startOver = useCallback(() => {
    setProcessedIds(new Set());
    setSkippedIds(new Set());
    setSkippedSenders(new Set());
    setStats({ deleted: 0, archived: 0, unsubscribed: 0 });
    setSelectedIds(new Set());
    setEmailBuffer([]);
    setNextPageToken(undefined);
    setHasMoreEmails(true);
    setIsInitialized(false);
    utils.emails.list.invalidate();
  }, [utils.emails.list]);

  const contextValue = useMemo(
    () => ({
      currentBatch,
      selectedIds,
      isLoading: isInitialLoading && !isInitialized,
      isProcessing: deleteMutation.isPending || archiveMutation.isPending || unsubscribeMutation.isPending,
      error: error as Error | null,
      selectAll,
      deselectAll,
      toggleSelection,
      processSelected,
      skipBatch,
      startOver,
      stats,
      isComplete,
      mode,
    }),
    [
      currentBatch,
      selectedIds,
      isInitialLoading,
      isInitialized,
      deleteMutation.isPending,
      archiveMutation.isPending,
      unsubscribeMutation.isPending,
      error,
      selectAll,
      deselectAll,
      toggleSelection,
      processSelected,
      skipBatch,
      startOver,
      stats,
      isComplete,
      mode,
    ],
  );

  return (
    <EmailContext.Provider value={contextValue}>
      {children}
    </EmailContext.Provider>
  );
}

export function useEmails() {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error("useEmails must be used within an EmailProvider");
  }
  return context;
}
