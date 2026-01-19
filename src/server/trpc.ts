import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";

export const createTRPCContext = async () => {
  const session = await auth();
  return { session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.accessToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource",
    });
  }

  if (ctx.session.error === "RefreshTokenError") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      accessToken: ctx.session.accessToken,
    },
  });
});
