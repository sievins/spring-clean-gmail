import type { Email } from "@/types/email";

export interface ClassificationResult {
  action: "delete" | "archive" | "keep";
  confidence: number;
  reasons: string[];
}

interface ClassificationContext extends Email {
  hasListUnsubscribe: boolean;
  isUnread: boolean;
  isStarred: boolean;
  threadMessageCount: number;
  userEmail?: string;
}

// Known financial/important domains (partial matches)
const FINANCIAL_DOMAINS = [
  "chase",
  "bankofamerica",
  "wellsfargo",
  "citi",
  "capitalone",
  "amex",
  "americanexpress",
  "discover",
  "paypal",
  "venmo",
  "zelle",
  "fidelity",
  "vanguard",
  "schwab",
  "etrade",
  "robinhood",
];

const INSURANCE_DOMAINS = [
  "geico",
  "statefarm",
  "progressive",
  "allstate",
  "libertymutual",
  "usaa",
  "nationwide",
  "aetna",
  "cigna",
  "anthem",
  "bluecross",
  "united",
  "kaiser",
  "humana",
];

const MEDICAL_DOMAINS = [
  "mychart",
  "patient",
  "health",
  "medical",
  "hospital",
  "clinic",
  "doctor",
  "pharmacy",
  "cvs",
  "walgreens",
];

const LEGAL_DOMAINS = ["legal", "law", "attorney", "lawyer", "court"];

// Promotional sender patterns
const PROMO_SENDER_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /marketing/i,
  /newsletter/i,
  /promo/i,
  /deals/i,
  /offers/i,
  /sales/i,
  /info@/i,
  /hello@/i,
  /support@/i,
];

// Delete-suggesting subject patterns
const DELETE_SUBJECT_PATTERNS = [
  /unsubscribe/i,
  /\d+%\s*off/i,
  /limited\s*time/i,
  /sale\s*ends/i,
  /flash\s*sale/i,
  /don't\s*miss/i,
  /last\s*chance/i,
  /act\s*now/i,
  /exclusive\s*offer/i,
  /free\s*shipping/i,
  /order\s*now/i,
  /shop\s*now/i,
  /buy\s*now/i,
  /save\s*\$/i,
  /clearance/i,
  /black\s*friday/i,
  /cyber\s*monday/i,
  /daily\s*deal/i,
  /weekly\s*digest/i,
  /newsletter/i,
];

// Transient content patterns (delete after age threshold)
const TRANSIENT_CONTENT_PATTERNS = [
  /verification\s*code/i,
  /verify\s*your/i,
  /reset\s*your\s*password/i,
  /one-time\s*password/i,
  /otp/i,
  /security\s*code/i,
  /login\s*code/i,
  /confirm\s*your\s*email/i,
  /package\s*(has\s*been\s*)?delivered/i,
  /your\s*order\s*(has\s*)?(been\s*)?shipped/i,
  /tracking\s*(number|update)/i,
];

// Archive-suggesting subject patterns
const ARCHIVE_SUBJECT_PATTERNS = [
  /receipt/i,
  /invoice/i,
  /confirmation/i,
  /itinerary/i,
  /booking/i,
  /reservation/i,
  /statement/i,
  /bill/i,
  /payment/i,
  /order\s*#/i,
  /order\s*confirmation/i,
  /your\s*order/i,
  /claim/i,
  /policy/i,
  /contract/i,
  /agreement/i,
  /tax/i,
  /w-?2/i,
  /1099/i,
];

// Gmail label constants
const PROMO_LABELS = ["CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_SOCIAL"];

function getDaysOld(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function matchesDomain(email: string, domains: string[]): boolean {
  const lowerEmail = email.toLowerCase();
  return domains.some((domain) => lowerEmail.includes(domain));
}

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyEmail(context: ClassificationContext): ClassificationResult {
  const reasons: string[] = [];
  let deleteScore = 0;
  let archiveScore = 0;
  let keepScore = 0;

  const daysOld = getDaysOld(context.date);
  const senderEmail = context.from.email.toLowerCase();
  const subject = context.subject;
  const snippet = context.snippet;
  const combinedText = `${subject} ${snippet}`;

  // ============ KEEP SIGNALS (highest priority) ============

  // Starred emails - never suggest
  if (context.isStarred || context.labels.includes("STARRED")) {
    keepScore += 100;
    reasons.push("Starred email");
  }

  // Very recent emails (< 7 days) - keep unless clearly promotional
  if (daysOld < 7) {
    keepScore += 30;
    reasons.push("Less than 7 days old");
  }

  // Unread emails - keep unless promotional
  if (context.isUnread && !context.labels.some((l) => PROMO_LABELS.includes(l))) {
    keepScore += 40;
    reasons.push("Unread email");
  }

  // User's own sent email in thread
  if (context.userEmail && senderEmail === context.userEmail.toLowerCase()) {
    keepScore += 50;
    reasons.push("Your own email");
  }

  // ============ DELETE SIGNALS ============

  // Promotional labels
  if (context.labels.includes("CATEGORY_PROMOTIONS")) {
    deleteScore += 25;
    reasons.push("Promotional email");
  }

  if (context.labels.includes("CATEGORY_UPDATES")) {
    deleteScore += 15;
    reasons.push("Updates/notifications");
  }

  if (context.labels.includes("CATEGORY_SOCIAL")) {
    deleteScore += 10;
    reasons.push("Social notification");
  }

  // List-Unsubscribe header present
  if (context.hasListUnsubscribe) {
    deleteScore += 20;
    reasons.push("Marketing email (has unsubscribe)");
  }

  // Promotional sender patterns
  if (matchesPatterns(senderEmail, PROMO_SENDER_PATTERNS)) {
    deleteScore += 15;
    reasons.push("Automated sender address");
  }

  // Delete-suggesting subject patterns
  if (matchesPatterns(subject, DELETE_SUBJECT_PATTERNS)) {
    deleteScore += 25;
    reasons.push("Promotional subject line");
  }

  // Transient content (verification codes, shipping notifications)
  if (matchesPatterns(combinedText, TRANSIENT_CONTENT_PATTERNS)) {
    if (daysOld > 14) {
      deleteScore += 35;
      reasons.push("Expired notification (>14 days)");
    } else if (daysOld > 7) {
      deleteScore += 15;
      reasons.push("Old notification");
    }
  }

  // ============ ARCHIVE SIGNALS ============

  // Has attachments - archive to be safe
  if (context.hasAttachments) {
    archiveScore += 30;
    reasons.push("Has attachments");
  }

  // Financial domain
  if (matchesDomain(senderEmail, FINANCIAL_DOMAINS)) {
    archiveScore += 35;
    reasons.push("Financial institution");
  }

  // Insurance domain
  if (matchesDomain(senderEmail, INSURANCE_DOMAINS)) {
    archiveScore += 30;
    reasons.push("Insurance provider");
  }

  // Medical domain
  if (matchesDomain(senderEmail, MEDICAL_DOMAINS)) {
    archiveScore += 30;
    reasons.push("Healthcare provider");
  }

  // Legal domain
  if (matchesDomain(senderEmail, LEGAL_DOMAINS)) {
    archiveScore += 35;
    reasons.push("Legal correspondence");
  }

  // Archive-suggesting subject patterns
  if (matchesPatterns(subject, ARCHIVE_SUBJECT_PATTERNS)) {
    archiveScore += 25;
    reasons.push("Receipt/confirmation/statement");
  }

  // Purchase category
  if (context.labels.includes("CATEGORY_PURCHASES")) {
    archiveScore += 20;
    reasons.push("Purchase-related");
  }

  // Important label
  if (context.labels.includes("IMPORTANT")) {
    archiveScore += 15;
    reasons.push("Marked as important");
  }

  // Thread with multiple messages (conversation)
  if (context.threadMessageCount > 1) {
    archiveScore += 20;
    reasons.push("Part of conversation thread");
  }

  // ============ DETERMINE ACTION ============

  // Remove duplicate reasons
  const uniqueReasons = [...new Set(reasons)];

  // Keep takes absolute priority if score is high enough
  if (keepScore >= 50) {
    return {
      action: "keep",
      confidence: Math.min(keepScore / 100, 1),
      reasons: uniqueReasons.filter(
        (r) =>
          r.includes("Starred") ||
          r.includes("days old") ||
          r.includes("Unread") ||
          r.includes("Your own")
      ),
    };
  }

  // Calculate net scores
  const netDeleteScore = deleteScore - archiveScore * 0.5;
  const netArchiveScore = archiveScore - deleteScore * 0.3;

  // Determine action based on scores
  if (netDeleteScore > netArchiveScore && deleteScore >= 25) {
    return {
      action: "delete",
      confidence: Math.min(deleteScore / 80, 1),
      reasons: uniqueReasons.filter(
        (r) =>
          r.includes("Promotional") ||
          r.includes("Marketing") ||
          r.includes("Automated") ||
          r.includes("notification") ||
          r.includes("Updates") ||
          r.includes("Social")
      ),
    };
  }

  if (netArchiveScore > 0 && archiveScore >= 20) {
    return {
      action: "archive",
      confidence: Math.min(archiveScore / 60, 1),
      reasons: uniqueReasons.filter(
        (r) =>
          r.includes("attachment") ||
          r.includes("Financial") ||
          r.includes("Insurance") ||
          r.includes("Healthcare") ||
          r.includes("Legal") ||
          r.includes("Receipt") ||
          r.includes("Purchase") ||
          r.includes("Important") ||
          r.includes("conversation")
      ),
    };
  }

  // Default to keep if no strong signals
  return {
    action: "keep",
    confidence: 0.3,
    reasons: ["No clear delete/archive signals"],
  };
}
