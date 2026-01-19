# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (http://localhost:3000)
bun run build    # Build for production
bun run lint     # Run ESLint
bun start        # Start production server
```

## Architecture

This is a Next.js 16 project using the App Router pattern with:
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Bun** as the package manager

### Project Structure

- `src/app/` - App Router pages and layouts
- `src/app/layout.tsx` - Root layout with Geist font configuration
- `src/app/page.tsx` - Home page component
- `src/app/globals.css` - Global styles and Tailwind theme configuration

### Path Aliases

Use `@/*` to import from `src/*` (configured in tsconfig.json).
