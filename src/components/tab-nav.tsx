"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabNav() {
  const pathname = usePathname();
  const currentTab = pathname.includes("/archive") ? "archive" : "delete";

  return (
    <Tabs value={currentTab}>
      <TabsList>
        <TabsTrigger value="delete" asChild>
          <Link href="/delete">Delete</Link>
        </TabsTrigger>
        <TabsTrigger value="archive" asChild>
          <Link href="/archive">Archive</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
