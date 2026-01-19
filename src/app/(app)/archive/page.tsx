import { EmailProvider } from "@/components/email-context";
import { AnimatedEmailList } from "@/components/animated-email-list";
import { ActionBar } from "@/components/action-bar";

export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Suggested for Archive</h1>
        <p className="text-muted-foreground">
          These emails may contain important information like receipts or
          confirmations. Review and archive to keep them out of your inbox.
        </p>
      </div>

      <EmailProvider mode="archive">
        <AnimatedEmailList />
        <ActionBar />
      </EmailProvider>
    </div>
  );
}
