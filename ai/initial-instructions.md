# Gmail Cleanup App

## Overview
Build a Next.js web app that helps clean up Gmail by suggesting emails to
delete or archive. The app presents emails in batches, lets users
confirm/deselect suggestions, then processes them with smooth animations.

The app has two modes:
- **Delete suggestions**: Suggests emails to permanently delete (to free up storage). This includes both inbox emails AND previously archived emails.
- **Archive suggestions**: Suggests inbox emails to archive (to clean up inbox while preserving emails for later search).

## Tech Stack
- **Framework**: Next.js (App Router) - already initialized
- **API Layer**: tRPC for server/client communication
- **Auth**: better-auth with Google OAuth provider, stateless session management, email whitelist
- **Environment Variables**: @t3-oss/env-nextjs
- **UI**: shadcn/ui with a minimal, sleek theme
- **Database/Cache** (if needed): Neon (Postgres), Redis, QStash (Vercel deployment)
- **Testing**: Vitest
- **Formatting**: Prettier
- **Gmail**: Gmail API with OAuth 2.0

## Build Phases

### Phase 1: Project Setup & Core UI
1. Configure tRPC with App Router
2. Set up shadcn/ui with a minimal theme
3. Implement dark/light theme toggle (persist preference in localStorage)
4. Create the base layout with tab navigation: "Delete" and "Archive"
5. Build the email list component:
   - Each row shows: checkbox, sender, subject, preview text (truncated), date
   - Checkbox on left, pre-selected by default
   - Responsive design (stack on mobile)
6. Add skeleton loaders for loading states
7. Set up Vitest with a few component tests

### Phase 2: Authentication
1. Set up better-auth with:
   - Google OAuth provider (reuse the same Google OAuth app as Gmail API)
   - Stateless session management (JWT-based, no database sessions)
   - Email whitelist: only allow specific emails to access the app
```typescript
     const allowedEmails = process.env.ALLOWED_EMAILS?.split(',') ?? [];
     // Block sign-in if email not in whitelist
```
2. Create auth UI:
   - Landing page with "Sign in with Google" button
   - Show "Access denied" message if email not whitelisted
   - Redirect to main app after successful auth
3. Protect all app routes - redirect to landing if not authenticated
4. Store Gmail OAuth tokens for API access (separate from auth session)

### Phase 3: Gmail API Integration
1. Create tRPC routes:
   - `emails.listForDeletion` - Fetch emails for deletion suggestions (all emails, including archived)
   - `emails.listForArchiving` - Fetch inbox emails for archive suggestions (INBOX label only)
   - `emails.delete` - Batch delete emails by ID
   - `emails.archive` - Batch archive (remove INBOX label) by ID
2. Implement email fetching with pre-loading:
   - Fetch 3 pages ahead (30 emails buffer)
   - Store in client state for instant batch transitions
3. Handle Gmail API rate limits (250 quota units/user/second):
   - Implement exponential backoff on 429 errors
   - Batch operations where possible (Gmail supports batch requests)

### Phase 4: Classification Heuristic
Implement a rule-based classifier that returns: "delete" | "archive" | "keep"

**Delete signals** (high confidence = auto-suggest delete):
- Sender patterns: contains "noreply", "marketing", "newsletter", "promo"
- Subject patterns: "unsubscribe", "% off", "limited time", "sale ends"
- Labels: CATEGORY_PROMOTIONS, CATEGORY_UPDATES
- Age: shipping notifications > 14 days old
- Content: contains "verification code", "reset your password"
- Headers: List-Unsubscribe header present
- Note: These rules apply to ALL emails (inbox + archived) when suggesting deletions

**Archive signals** (suggest archive, not delete):
- Has attachments (user hasn't saved elsewhere - we can't know, so archive)
- Sender domain matches: known banks, medical providers, insurance, legal
- Subject patterns: "receipt", "invoice", "confirmation", "itinerary"
- Labels: CATEGORY_PURCHASES
- Thread with multiple replies (conversation context)
- Note: These rules only apply to INBOX emails

**Keep signals** (never suggest):
- Starred emails
- Emails < 7 days old
- User's own sent emails in threads

Create a scoring system:
```typescript
interface ClassificationResult {
  action: 'delete' | 'archive' | 'keep';
  confidence: number; // 0-1
  reasons: string[]; // Human-readable explanations shown in UI
}
```

### Phase 5: Batch Processing & Animations
1. Display emails in batches of 10
2. Track session state:
   - `processed`: Set<emailId> - emails user has seen and acted on
   - `skipped`: Set<emailId> - deselected emails (don't show again this session)
3. Implement slide animation on action:
   - Selected emails slide out to the right
   - Next batch slides in from the left
   - Use Framer Motion or CSS transitions
   - Next batch must be pre-loaded (no loading state during transition)
4. Optimistic updates:
   - Immediately update UI on action
   - Revert and show error toast if API call fails
5. "Start Over" button:
   - Clears `processed` and `skipped` sets
   - Re-fetches emails from Gmail API
   - Previously skipped emails can reappear
6. Completion state:
   - Show celebratory message when no more emails match criteria
   - Display stats: "You cleaned up X emails (Y deleted, Z archived)"

## Data Structures
```typescript
interface Email {
  id: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  snippet: string; // Preview text from Gmail API
  date: Date;
  labels: string[];
  hasAttachments: boolean;
  isArchived: boolean; // true if email lacks INBOX label
}

interface EmailBatch {
  emails: Email[];
  nextPageToken?: string;
}

interface SessionState {
  deleteQueue: Email[]; // Pre-loaded delete suggestions (inbox + archived)
  archiveQueue: Email[]; // Pre-loaded archive suggestions (inbox only)
  currentBatch: Email[]; // Currently displayed
  processedIds: Set<string>;
  skippedIds: Set<string>;
  stats: {
    deleted: number;
    archived: number;
  };
}
```

## UI/UX Details
- **Theme**: Minimal, clean, lots of whitespace. Muted colors. 
- **Primary actions**: Solid buttons. "Delete Selected" = destructive red. "Archive Selected" = neutral.
- **Email rows**: Subtle hover state, clear visual hierarchy (sender bold, subject normal, snippet muted)
- **Email badge**: Show small "Archived" badge on emails that are already archived (in delete view)
- **Selection**: Checkbox with indeterminate state for "select all"
- **Mobile**: Stack email metadata vertically, full-width rows
- **Animations**: 300ms duration, ease-out timing, stagger email rows slightly

## Error Handling
- Network errors: Toast notification + retry button
- Auth expired: Redirect to re-authenticate
- Rate limited: Show "Please wait..." with countdown
- No emails found: Friendly empty state with illustration
- Email not whitelisted: Show friendly "Access denied" with contact info

## Environment Variables
```
# Auth (better-auth)
BETTER_AUTH_SECRET=
ALLOWED_EMAILS=user1@example.com,user2@example.com

# Google OAuth (shared between better-auth and Gmail API)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (if needed)
DATABASE_URL=
REDIS_URL=
```

## Out of Scope (Future)
- LLM-based classification
- Email rules/filters management
- Undo functionality beyond current session
