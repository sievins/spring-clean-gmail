"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { EmailWithClassification } from "@/types/email";

interface EmailRowProps {
  email: EmailWithClassification;
  selected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (diffDays < 365) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmailRow({ email, selected, onSelectionChange }: EmailRowProps) {
  const reasons = email.classification?.reasons ?? [];

  return (
    <div
      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
      role="row"
    >
      <Checkbox
        id={`email-${email.id}`}
        checked={selected}
        onCheckedChange={(checked) => onSelectionChange(checked === true)}
        className="mt-1"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{email.from.name}</span>
            {email.hasAttachments && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-muted-foreground"
                aria-label="Has attachments"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </div>
          <span className="truncate text-sm">{email.subject}</span>
          <span className="truncate text-sm text-muted-foreground">
            {email.snippet}
          </span>
          {reasons.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {reasons.slice(0, 3).map((reason, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="shrink-0 text-sm text-muted-foreground">
          {formatDate(email.date)}
        </span>
      </div>
    </div>
  );
}
