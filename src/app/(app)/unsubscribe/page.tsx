import { EmailProvider } from "@/components/email-context";
import { AnimatedEmailList } from "@/components/animated-email-list";
import { ActionBar } from "@/components/action-bar";

export default function UnsubscribePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Unsubscribe from Mailing Lists</h1>
        <p className="text-muted-foreground">
          These emails have unsubscribe links. Review and select which mailing
          lists you want to unsubscribe from.
        </p>
      </div>

      <EmailProvider mode="unsubscribe">
        <AnimatedEmailList />
        <ActionBar />
      </EmailProvider>
    </div>
  );
}
