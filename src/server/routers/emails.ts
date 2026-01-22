import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { fetchEmails, deleteEmails, archiveEmails, fetchEmailContent, unsubscribeFromEmails } from "@/lib/gmail";

export const emailsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["delete", "archive", "unsubscribe"]),
        pageToken: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userEmail = ctx.session.user?.email ?? undefined;
      const result = await fetchEmails(
        ctx.accessToken,
        input.mode,
        input.pageToken,
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

  unsubscribe: protectedProcedure
    .input(
      z.object({
        emails: z.array(
          z.object({
            id: z.string(),
            listUnsubscribe: z.string(),
            listUnsubscribePost: z.string().optional(),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await unsubscribeFromEmails(ctx.accessToken, input.emails);
      return {
        success: true,
        count: result.successful,
        failed: result.failed,
        results: result.results,
      };
    }),

  get: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const content = await fetchEmailContent(ctx.accessToken, input.emailId);
      return content;
    }),
});
