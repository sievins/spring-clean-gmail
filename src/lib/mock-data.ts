import type { Email, EmailWithClassification, ClassificationResult } from "@/types/email";

function createMockEmail(
  partial: Partial<Email> & { id: string; from: Email["from"]; subject: string }
): Email {
  return {
    threadId: `t${partial.id}`,
    snippet: "",
    date: new Date(),
    labels: [],
    hasAttachments: false,
    hasListUnsubscribe: false,
    isUnread: false,
    isStarred: false,
    threadMessageCount: 1,
    ...partial,
  };
}

function withClassification(
  email: Email,
  classification: ClassificationResult
): EmailWithClassification {
  return { ...email, classification };
}

export const mockDeleteEmails: EmailWithClassification[] = [
  withClassification(
    createMockEmail({
      id: "1",
      from: { name: "Acme Marketing", email: "noreply@acme-marketing.com" },
      subject: "50% OFF - Limited Time Only!",
      snippet:
        "Don't miss out on our biggest sale of the year. Shop now and save big on all your favorite items...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      labels: ["CATEGORY_PROMOTIONS"],
      hasListUnsubscribe: true,
    }),
    { action: "delete", confidence: 0.9, reasons: ["Promotional email", "Marketing email (has unsubscribe)"] }
  ),
  withClassification(
    createMockEmail({
      id: "2",
      from: { name: "Newsletter Weekly", email: "newsletter@weekly.com" },
      subject: "Your Weekly Digest - Jan 2026",
      snippet:
        "Here's what you missed this week: Top stories, trending topics, and more curated content...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      labels: ["CATEGORY_UPDATES"],
      hasListUnsubscribe: true,
    }),
    { action: "delete", confidence: 0.85, reasons: ["Updates/notifications", "Marketing email (has unsubscribe)"] }
  ),
  withClassification(
    createMockEmail({
      id: "3",
      from: { name: "FedEx", email: "tracking@fedex.com" },
      subject: "Your package has been delivered",
      snippet:
        "Your package was delivered on January 5th at 2:34 PM. Thank you for using FedEx...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
      labels: ["CATEGORY_UPDATES"],
    }),
    { action: "delete", confidence: 0.75, reasons: ["Expired notification (>14 days)", "Updates/notifications"] }
  ),
];

export const mockArchiveEmails: EmailWithClassification[] = [
  withClassification(
    createMockEmail({
      id: "a1",
      from: { name: "Amazon", email: "order-update@amazon.com" },
      subject: "Your Amazon.com order #112-3456789",
      snippet:
        "Thank you for your order. Your estimated delivery date is January 10-12. Track your package...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      labels: ["CATEGORY_PURCHASES"],
    }),
    { action: "archive", confidence: 0.8, reasons: ["Purchase-related", "Receipt/confirmation/statement"] }
  ),
  withClassification(
    createMockEmail({
      id: "a2",
      from: { name: "Chase Bank", email: "alerts@chase.com" },
      subject: "Your statement is ready",
      snippet:
        "Your December statement is now available. Log in to view your account activity and balance...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      labels: ["IMPORTANT"],
      hasAttachments: true,
    }),
    { action: "archive", confidence: 0.95, reasons: ["Financial institution", "Has attachments", "Receipt/confirmation/statement"] }
  ),
  withClassification(
    createMockEmail({
      id: "a3",
      from: { name: "Delta Airlines", email: "receipts@delta.com" },
      subject: "Your flight itinerary - Confirmation #ABC123",
      snippet:
        "Thank you for booking with Delta. Your flight from JFK to LAX departs on February 15...",
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      labels: ["CATEGORY_PURCHASES"],
      hasAttachments: true,
    }),
    { action: "archive", confidence: 0.9, reasons: ["Receipt/confirmation/statement", "Has attachments", "Purchase-related"] }
  ),
];

export function getMockEmails(mode: "delete" | "archive"): EmailWithClassification[] {
  return mode === "delete" ? mockDeleteEmails : mockArchiveEmails;
}
