import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/tab-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  if (session.error === "RefreshTokenError") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-xl font-semibold">
          Spring Clean Gmail
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {session.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </header>

      <div className="border-b px-6 py-3">
        <TabNav />
      </div>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
