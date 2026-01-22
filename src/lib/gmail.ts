import { google } from "googleapis";
import type { Email, EmailWithClassification } from "@/types/email";
import { classifyEmail, classifyForUnsubscribe } from "./classifier";
import { env } from "@/env";

const gmail = google.gmail("v1");

interface GmailMessagePart {
  mimeType?: string;
  filename?: string;
  body?: {
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: GmailMessagePart[];
    mimeType?: string;
    body?: {
      size?: number;
      data?: string;
    };
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
  const listUnsubscribePost = getHeader(headers, "List-Unsubscribe-Post");
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
    listUnsubscribe: listUnsubscribe || undefined,
    listUnsubscribePost: listUnsubscribePost || undefined,
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
  mode: "delete" | "archive" | "unsubscribe",
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
          metadataHeaders: ["From", "Subject", "Date", "List-Unsubscribe", "List-Unsubscribe-Post"],
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

    // Classify the email based on mode
    const classification = mode === "unsubscribe"
      ? classifyForUnsubscribe({ ...email, userEmail })
      : classifyEmail({ ...email, userEmail });

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
    } else if (mode === "archive") {
      return email.classification.action === "archive";
    } else {
      return email.classification.action === "unsubscribe";
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

interface UnsubscribeResult {
  emailId: string;
  success: boolean;
  method?: "one-click" | "https" | "mailto";
  error?: string;
}

function parseUnsubscribeHeader(header: string): { urls: string[]; mailto?: string } {
  const urls: string[] = [];
  let mailto: string | undefined;

  // Header format: <URL1>, <URL2>, <mailto:address>
  const parts = header.split(",").map((p) => p.trim());
  for (const part of parts) {
    // Extract URL from angle brackets if present
    const match = part.match(/<([^>]+)>/);
    const url = match ? match[1] : part;

    if (url.toLowerCase().startsWith("mailto:")) {
      mailto = url;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      urls.push(url);
    }
  }

  return { urls, mailto };
}

async function unsubscribeOneClick(
  url: string
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "List-Unsubscribe=One-Click",
    });
    // Accept 200-299 and 3xx redirects as success (many unsubscribe endpoints redirect)
    return response.ok || (response.status >= 300 && response.status < 400);
  } catch {
    return false;
  }
}

async function unsubscribeViaUrl(url: string): Promise<boolean> {
  try {
    // Try POST first (some services expect POST)
    const postResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (postResponse.ok || (postResponse.status >= 300 && postResponse.status < 400)) {
      return true;
    }

    // Fall back to GET
    const getResponse = await fetch(url, { method: "GET" });
    return getResponse.ok || (getResponse.status >= 300 && getResponse.status < 400);
  } catch {
    return false;
  }
}

async function unsubscribeViaMailto(
  accessToken: string,
  mailto: string
): Promise<boolean> {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    // Parse mailto URL: mailto:address?subject=xxx&body=xxx
    const url = new URL(mailto);
    const to = url.pathname;
    const subject = url.searchParams.get("subject") || "Unsubscribe";
    const body = url.searchParams.get("body") || "Please unsubscribe me from this mailing list.";

    // Create raw email
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    // Base64url encode
    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await withRetry(() =>
      gmail.users.messages.send({
        auth,
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      })
    );

    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromEmail(
  accessToken: string,
  emailId: string,
  listUnsubscribe: string,
  listUnsubscribePost?: string
): Promise<UnsubscribeResult> {
  const { urls, mailto } = parseUnsubscribeHeader(listUnsubscribe);
  const httpsUrl = urls.find((u) => u.startsWith("https://"));

  // 1. Try One-Click Unsubscribe (RFC 8058) if supported
  if (listUnsubscribePost?.toLowerCase().includes("list-unsubscribe=one-click") && httpsUrl) {
    const success = await unsubscribeOneClick(httpsUrl);
    if (success) {
      return { emailId, success: true, method: "one-click" };
    }
  }

  // 2. Try HTTPS URL
  if (httpsUrl) {
    const success = await unsubscribeViaUrl(httpsUrl);
    if (success) {
      return { emailId, success: true, method: "https" };
    }
  }

  // 3. Try mailto as last resort
  if (mailto) {
    const success = await unsubscribeViaMailto(accessToken, mailto);
    if (success) {
      return { emailId, success: true, method: "mailto" };
    }
  }

  return {
    emailId,
    success: false,
    error: "No unsubscribe method succeeded",
  };
}

export async function unsubscribeFromEmails(
  accessToken: string,
  emails: Array<{ id: string; listUnsubscribe: string; listUnsubscribePost?: string }>
): Promise<{ successful: number; failed: number; results: UnsubscribeResult[] }> {
  const results: UnsubscribeResult[] = [];

  // Process unsubscribes sequentially to avoid rate limiting
  for (const email of emails) {
    const result = await unsubscribeFromEmail(
      accessToken,
      email.id,
      email.listUnsubscribe,
      email.listUnsubscribePost
    );
    results.push(result);

    // Small delay between requests to be respectful
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { successful, failed, results };
}

function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64 encoding
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

interface ExtractedBody {
  content: string;
  isHtml: boolean;
}

function extractHtmlFromParts(parts: GmailMessagePart[] | undefined): ExtractedBody | null {
  if (!parts) return null;

  // First, prefer HTML content
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return { content: decodeBase64Url(part.body.data), isHtml: true };
    }
  }

  // Fall back to plain text
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return { content: decodeBase64Url(part.body.data), isHtml: false };
    }
  }

  // Check nested parts (multipart/alternative, multipart/mixed, etc.)
  for (const part of parts) {
    if (part.parts) {
      const result = extractHtmlFromParts(part.parts);
      if (result) return result;
    }
  }

  return null;
}

function extractEmailBody(message: GmailMessage): ExtractedBody {
  const payload = message.payload;
  if (!payload) return { content: "", isHtml: false };

  // Simple message with body directly in payload
  if (payload.body?.data) {
    if (payload.mimeType === "text/html") {
      return { content: decodeBase64Url(payload.body.data), isHtml: true };
    }
    if (payload.mimeType === "text/plain") {
      return { content: decodeBase64Url(payload.body.data), isHtml: false };
    }
  }

  // Multipart message - extract from parts
  return extractHtmlFromParts(payload.parts) ?? { content: "", isHtml: false };
}

export interface EmailContent {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
  date: Date;
  hasAttachments: boolean;
}

export async function fetchEmailContent(
  accessToken: string,
  emailId: string
): Promise<EmailContent> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const response = await withRetry(() =>
    gmail.users.messages.get({
      auth,
      userId: "me",
      id: emailId,
      format: "full",
    })
  );

  const message = response.data as GmailMessage;
  const headers = message.payload?.headers;
  const { content, isHtml } = extractEmailBody(message);

  return {
    id: message.id,
    threadId: message.threadId,
    from: parseFromHeader(getHeader(headers, "From")),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject") || "(no subject)",
    body: content,
    isHtml,
    date: message.internalDate
      ? new Date(parseInt(message.internalDate))
      : new Date(),
    hasAttachments: hasAttachments(message),
  };
}
