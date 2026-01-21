import { google } from "googleapis";
import type { Email, EmailWithClassification } from "@/types/email";
import { classifyEmail } from "./classifier";
import { env } from "@/env";

const gmail = google.gmail("v1");

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: Array<{ filename?: string }>;
  };
  snippet?: string;
  internalDate?: string;
}

interface GmailThread {
  id: string;
  messages?: Array<{ id: string }>;
}

interface FetchEmailsResult {
  emails: EmailWithClassification[];
  nextPageToken?: string;
}

function getHeader(
  headers: Array<{ name: string; value: string }> | undefined,
  name: string
): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]*)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || match[2] || "",
      email: match[2] || "",
    };
  }
  return { name: from, email: from };
}

function hasAttachments(message: GmailMessage): boolean {
  const parts = message.payload?.parts;
  if (!parts) return false;
  return parts.some((part) => part.filename && part.filename.length > 0);
}

function transformMessage(
  message: GmailMessage,
  threadMessageCount: number
): Email {
  const headers = message.payload?.headers;
  const from = getHeader(headers, "From");
  const subject = getHeader(headers, "Subject");
  const listUnsubscribe = getHeader(headers, "List-Unsubscribe");
  const date = message.internalDate
    ? new Date(parseInt(message.internalDate))
    : new Date();

  const labels = message.labelIds || [];

  return {
    id: message.id,
    threadId: message.threadId,
    from: parseFromHeader(from),
    subject: subject || "(no subject)",
    snippet: message.snippet || "",
    date,
    labels,
    hasAttachments: hasAttachments(message),
    hasListUnsubscribe: !!listUnsubscribe,
    isUnread: labels.includes("UNREAD"),
    isStarred: labels.includes("STARRED"),
    threadMessageCount,
  };
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error (429)
      const isRateLimited =
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 429;

      if (!isRateLimited || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function fetchEmails(
  accessToken: string,
  mode: "delete" | "archive",
  pageToken?: string,
  userEmail?: string
): Promise<FetchEmailsResult> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  // Fetch message list - exclude starred and very recent
  // Use env.GMAIL_FETCH_LIMIT (max 500) to get as many emails as possible for grouping by sender
  const listResponse = await withRetry(() =>
    gmail.users.messages.list({
      auth,
      userId: "me",
      maxResults: env.GMAIL_FETCH_LIMIT,
      pageToken,
      q: "in:inbox -is:starred older_than:1d",
    })
  );

  const messages = listResponse.data.messages || [];

  if (messages.length === 0) {
    return { emails: [], nextPageToken: undefined };
  }

  // Fetch full message details and thread info in parallel
  const emailPromises = messages.map(async (msg) => {
    const [messageResponse, threadResponse] = await Promise.all([
      withRetry(() =>
        gmail.users.messages.get({
          auth,
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date", "List-Unsubscribe"],
        })
      ),
      withRetry(() =>
        gmail.users.threads.get({
          auth,
          userId: "me",
          id: msg.threadId!,
          format: "minimal",
        })
      ),
    ]);

    const threadMessageCount =
      (threadResponse.data as GmailThread).messages?.length || 1;
    const email = transformMessage(
      messageResponse.data as GmailMessage,
      threadMessageCount
    );

    // Classify the email
    const classification = classifyEmail({
      ...email,
      userEmail,
    });

    return {
      ...email,
      classification,
    } as EmailWithClassification;
  });

  const allEmails = await Promise.all(emailPromises);

  // Filter by classification action based on mode
  const filteredEmails = allEmails.filter((email) => {
    if (mode === "delete") {
      return email.classification.action === "delete";
    } else {
      return email.classification.action === "archive";
    }
  });

  // Sort by sender email to group emails from the same sender together
  const sortedEmails = filteredEmails.sort((a, b) =>
    a.from.email.toLowerCase().localeCompare(b.from.email.toLowerCase())
  );

  return {
    emails: sortedEmails,
    nextPageToken: listResponse.data.nextPageToken ?? undefined,
  };
}

export async function deleteEmails(
  accessToken: string,
  emailIds: string[]
): Promise<void> {
  if (emailIds.length === 0) return;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  // Use batchDelete for efficiency
  await withRetry(() =>
    gmail.users.messages.batchDelete({
      auth,
      userId: "me",
      requestBody: {
        ids: emailIds,
      },
    })
  );
}

export async function archiveEmails(
  accessToken: string,
  emailIds: string[]
): Promise<void> {
  if (emailIds.length === 0) return;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  // Use batchModify to remove INBOX label (archive)
  await withRetry(() =>
    gmail.users.messages.batchModify({
      auth,
      userId: "me",
      requestBody: {
        ids: emailIds,
        removeLabelIds: ["INBOX"],
      },
    })
  );
}
