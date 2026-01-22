export interface Email {
  id: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  snippet: string;
  date: Date;
  labels: string[];
  hasAttachments: boolean;
  // Classification metadata
  hasListUnsubscribe: boolean;
  listUnsubscribe?: string; // List-Unsubscribe header value (mailto: or https:// URLs)
  listUnsubscribePost?: string; // List-Unsubscribe-Post header (indicates one-click unsubscribe support)
  isUnread: boolean;
  isStarred: boolean;
  threadMessageCount: number;
}

export interface ClassificationResult {
  action: "delete" | "archive" | "keep" | "unsubscribe";
  confidence: number;
  reasons: string[];
}

export interface EmailWithClassification extends Email {
  classification: ClassificationResult;
}

export interface EmailBatch {
  emails: EmailWithClassification[];
  nextPageToken?: string;
}

export interface SessionState {
  deleteQueue: EmailWithClassification[];
  archiveQueue: EmailWithClassification[];
  currentBatch: EmailWithClassification[];
  processedIds: Set<string>;
  skippedIds: Set<string>;
  stats: {
    deleted: number;
    archived: number;
    unsubscribed: number;
  };
}
