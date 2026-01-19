import { EmailProvider } from "@/components/email-context";
import { AnimatedEmailList } from "@/components/animated-email-list";
import { ActionBar } from "@/components/action-bar";

export default function DeletePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Suggested for Deletion</h1>
        <p className="text-muted-foreground">
          These emails appear to be promotional, newsletters, or expired
          notifications. Review and confirm which ones to delete.
        </p>
      </div>

      <EmailProvider mode="delete">
        <AnimatedEmailList />
        <ActionBar />
      </EmailProvider>
    </div>
  );
}
