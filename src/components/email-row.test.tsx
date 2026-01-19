import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmailRow } from "./email-row";
import type { EmailWithClassification } from "@/types/email";

const mockEmail: EmailWithClassification = {
  id: "test-1",
  threadId: "thread-1",
  from: {
    name: "Test Sender",
    email: "test@example.com",
  },
  subject: "Test Subject Line",
  snippet: "This is a preview of the email content...",
  date: new Date("2026-01-10"),
  labels: ["INBOX"],
  hasAttachments: false,
  hasListUnsubscribe: false,
  isUnread: false,
  isStarred: false,
  threadMessageCount: 1,
  classification: {
    action: "delete",
    confidence: 0.8,
    reasons: ["Promotional email"],
  },
};

describe("EmailRow", () => {
  it("renders email sender name", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(screen.getByText("Test Sender")).toBeInTheDocument();
  });

  it("renders email subject", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(screen.getByText("Test Subject Line")).toBeInTheDocument();
  });

  it("renders email snippet", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(
      screen.getByText("This is a preview of the email content...")
    ).toBeInTheDocument();
  });

  it("shows attachment icon when email has attachments", () => {
    const emailWithAttachment = { ...mockEmail, hasAttachments: true };
    render(
      <EmailRow
        email={emailWithAttachment}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(screen.getByLabelText("Has attachments")).toBeInTheDocument();
  });

  it("does not show attachment icon when email has no attachments", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(screen.queryByLabelText("Has attachments")).not.toBeInTheDocument();
  });

  it("renders checkbox in selected state when selected prop is true", () => {
    render(
      <EmailRow email={mockEmail} selected={true} onSelectionChange={() => {}} />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders checkbox in unselected state when selected prop is false", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("calls onSelectionChange when checkbox is clicked", () => {
    const onSelectionChange = vi.fn();
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={onSelectionChange}
      />
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onSelectionChange).toHaveBeenCalledWith(true);
  });

  it("renders classification reasons as tags", () => {
    render(
      <EmailRow
        email={mockEmail}
        selected={false}
        onSelectionChange={() => {}}
      />
    );
    expect(screen.getByText("Promotional email")).toBeInTheDocument();
  });
});
