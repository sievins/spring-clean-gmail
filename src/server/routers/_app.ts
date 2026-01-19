import { router } from "../trpc";
import { emailsRouter } from "./emails";

export const appRouter = router({
  emails: emailsRouter,
});

export type AppRouter = typeof appRouter;
