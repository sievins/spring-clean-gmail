# Spring Clean Gmail

A web app that helps you quickly clean up your Gmail inbox. Get smart suggestions for emails to delete or archive, then confirm with one click.

## Features

- **Delete suggestions** - Identifies promotional emails, newsletters, and expired notifications that are safe to delete
- **Archive suggestions** - Finds receipts, confirmations, and other emails worth keeping but not in your inbox

### Coming Soon

- **Unsubscribe** - Easily unsubscribe from mailing lists directly from the app

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- Google Cloud project with OAuth credentials

### Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables in `.env.local`:
   - `GOOGLE_CLIENT_ID` - Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
   - `AUTH_SECRET` - Generate with: `openssl rand -base64 32`

5. Start the development server:
   ```bash
   bun dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and sign in with Google

## Scripts

```bash
bun dev          # Start development server
bun run build    # Build for production
bun start        # Start production server
bun run lint     # Run ESLint
bun test         # Run tests
```
