"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { trpc } from "@/trpc/client";
import type { EmailWithClassification } from "@/types/email";

interface EmailDetailDialogProps {
  email: EmailWithClassification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EmailIframe({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Write the HTML content to the iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: #1a1a1a;
              background: white;
              overflow-x: hidden;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #0066cc;
            }
            table {
              max-width: 100% !important;
            }
            /* Prevent horizontal scroll from wide content */
            * {
              max-width: 100%;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    doc.close();

    // Adjust iframe height to content
    const resizeObserver = new ResizeObserver(() => {
      if (doc.body) {
        iframe.style.height = `${doc.body.scrollHeight}px`;
      }
    });

    if (doc.body) {
      resizeObserver.observe(doc.body);
      // Initial height
      iframe.style.height = `${doc.body.scrollHeight}px`;
    }

    return () => resizeObserver.disconnect();
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0 min-h-[200px]"
      sandbox="allow-same-origin"
      title="Email content"
    />
  );
}

function PlainTextContent({ text }: { text: string }) {
  return (
    <div className="text-sm whitespace-pre-wrap break-words text-foreground/90">
      {text}
    </div>
  );
}

export function EmailDetailDialog({
  email,
  open,
  onOpenChange,
}: EmailDetailDialogProps) {
  const { data, isLoading } = trpc.emails.get.useQuery(
    { emailId: email?.id ?? "" },
    { enabled: open && !!email?.id }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85vh] max-w-3xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base font-medium leading-normal">
            {email?.subject ?? "Loading..."}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-1 text-sm">
              <div>
                <span className="text-muted-foreground">From: </span>
                <span className="text-foreground">
                  {email?.from.name}
                  {email?.from.email && (
                    <span className="text-muted-foreground">
                      {" "}
                      &lt;{email.from.email}&gt;
                    </span>
                  )}
                </span>
              </div>
              {data?.to && (
                <div>
                  <span className="text-muted-foreground">To: </span>
                  <span className="text-foreground">{data.to}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="text-foreground">
                  {email?.date ? formatFullDate(email.date) : ""}
                </span>
              </div>
              {email?.hasAttachments && (
                <div className="text-muted-foreground">
                  This email has attachments (not shown)
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 border-t pt-4 min-h-0">
          {isLoading ? (
            <div className="space-y-4 flex-1">
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-5/6" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-4/5" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-5/6" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-4/5" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-5/6" />
              <div className="h-6 bg-muted animate-pulse rounded w-full" />
            </div>
          ) : data?.body ? (
            data.isHtml ? (
              <EmailIframe html={data.body} />
            ) : (
              <PlainTextContent text={data.body} />
            )
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No content available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
