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
  isUnread: boolean;
  isStarred: boolean;
  threadMessageCount: number;
}

export interface ClassificationResult {
  action: "delete" | "archive" | "keep";
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
  };
}
