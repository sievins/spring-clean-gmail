import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { fetchEmails, deleteEmails, archiveEmails } from "@/lib/gmail";

export const emailsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["delete", "archive"]),
        pageToken: z.string().optional(),
        maxResults: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userEmail = ctx.session.user?.email ?? undefined;
      const result = await fetchEmails(
        ctx.accessToken,
        input.mode,
        input.pageToken,
        input.maxResults,
        userEmail
      );
      return result;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        emailIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await deleteEmails(ctx.accessToken, input.emailIds);
      return { success: true, count: input.emailIds.length };
    }),

  archive: protectedProcedure
    .input(
      z.object({
        emailIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await archiveEmails(ctx.accessToken, input.emailIds);
      return { success: true, count: input.emailIds.length };
    }),
});
