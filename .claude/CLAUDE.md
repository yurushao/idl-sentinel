# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDL Sentinel is a Next.js application that monitors Solana program IDLs (Interface Definition Languages) for changes and sends notifications to users via Telegram and Slack. The app tracks programs in real-time, detects structural changes with severity classification, and notifies subscribed users.

## Tech Stack

- **Framework**: Next.js 16 with App Router and React Server Components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Blockchain**: Solana Web3.js with Anchor IDL parsing
- **Authentication**: Wallet-based auth using Solana wallet adapters
- **Notifications**: Telegram Bot API and Slack webhooks
- **Styling**: Tailwind CSS with Radix UI components

## Common Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Build production bundle
pnpm start            # Run production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler check
```

### Database Management
```bash
# Link to Supabase project (first time only)
npx supabase link --project-ref your-project-ref

# Pull current remote schema to see changes
npx supabase db pull

# Push schema changes to remote
npx supabase db push
```

### Common SQL Operations
```bash
# Set admin user (run in Supabase SQL Editor)
UPDATE users SET is_admin = true WHERE wallet_address = 'YOUR_WALLET';
```

## Architecture

### Core Monitoring Flow

1. **Cron Job** ([/api/cron/monitor-idls/route.ts](src/app/api/cron/monitor-idls/route.ts))
   - Runs every 15 minutes (configured in [vercel.json](vercel.json))
   - Protected by `CRON_SECRET` environment variable
   - Orchestrates: monitoring → change detection → notifications

2. **IDL Fetching** ([lib/solana/idl-fetcher.ts](src/lib/solana/idl-fetcher.ts))
   - Derives IDL account address using Anchor's PDA derivation
   - Fetches compressed IDL data from on-chain accounts
   - Decompresses using pako and parses JSON structure
   - Includes retry logic with exponential backoff

3. **Monitoring System** ([lib/monitoring/monitor.ts](src/lib/monitoring/monitor.ts))
   - `monitorPrograms()`: Main entry point that checks all active programs
   - `fetchInitialIdl()`: One-time fetch when program is first added
   - Creates snapshots with SHA-256 hash for change detection
   - Logs all operations to `monitoring_logs` table

4. **Change Detection** ([lib/monitoring/change-detector.ts](src/lib/monitoring/change-detector.ts))
   - Compares old vs new IDL snapshots
   - Detects changes across: instructions, types, accounts, errors
   - Assigns severity levels: low, medium, high, critical
   - Critical: instruction removal, signer requirement changes
   - High: type/account removal, account structure changes
   - Medium: instruction modifications, type modifications
   - Low: additions of new elements

5. **Notification System**
   - **Slack** ([lib/notifications/slack.ts](src/lib/notifications/slack.ts))
     - User-configurable webhook URLs
     - Sends formatted messages with change summaries grouped by severity
     - Notifies only users watching the specific program
   - **Telegram** ([lib/notifications/telegram-user.ts](src/lib/notifications/telegram-user.ts))
     - Shared bot with per-user chat connections
     - Uses connection tokens for authentication flow
     - Similar watchlist-based notification logic

### Authentication & Authorization

- **Wallet-Based Auth** ([lib/auth/auth-context.tsx](src/lib/auth/auth-context.tsx))
  - Users sign a message with their Solana wallet
  - Backend verifies signature and issues JWT
  - JWT stored in cookies for session management

- **API Middleware** ([lib/auth/middleware.ts](src/lib/auth/middleware.ts))
  - Verifies JWT tokens on API routes
  - Sets `app.current_wallet` in Supabase session for RLS policies

- **Row Level Security (RLS)**
  - All tables have RLS enabled
  - Policies check `app.current_wallet` setting
  - Admin-only operations check `users.is_admin` flag
  - Users can only modify their own watchlist and settings

### Database Schema

Database uses a single `schema.sql` file as source of truth (not migrations). Key tables:

- **users**: Wallet addresses, admin status, notification settings
- **monitored_programs**: Programs being tracked (admin-managed)
- **idl_snapshots**: Historical IDL versions with SHA-256 hashes
- **idl_changes**: Detected changes with severity and notification status
- **user_watchlist**: User subscriptions to programs
- **telegram_connection_tokens**: Temporary tokens for Telegram bot auth
- **monitoring_logs**: System logs for debugging

### Frontend Structure

- **App Router** ([src/app/](src/app/))
  - Server Components by default
  - API routes in `app/api/`
  - Pages: programs, changes, settings, program detail

- **Components** ([src/components/](src/components/))
  - `ui/`: Shadcn-style Radix UI components
  - `programs/`: Program list, detail, create form
  - `changes/`: Change list, diff viewer
  - `dashboard/`: Stats cards
  - `watchlist/`: Watchlist management
  - `wallet/`: Wallet connection UI

- **Client-Side State**
  - React Query for data fetching and caching
  - Wallet adapter for Solana wallet connections
  - Auth context for user session

## Key Design Patterns

### Dual Supabase Clients

Two Supabase client instances are used:

```typescript
// Frontend & API routes (respects RLS)
export const supabase = createClient(url, anonKey)

// Admin operations only (bypasses RLS)
export const supabaseAdmin = createClient(url, serviceRoleKey)
```

Use `supabaseAdmin` ONLY in:
- API routes that need to bypass RLS
- Cron jobs
- System operations (monitoring, notifications)

### Watchlist-Based Notifications

Users receive notifications ONLY for programs they watch:
1. User adds program to watchlist
2. Change detected for that program
3. System queries `user_watchlist` table
4. Sends notification to users watching that program
5. Marks change as notified for that channel

### IDL Change Severity

Severity is auto-calculated based on change type:
- **Critical**: Breaking changes (instruction removal, signer changes)
- **High**: Major changes (account/type removal, structure changes)
- **Medium**: Moderate changes (instruction/type modifications)
- **Low**: Additive changes (new instructions/types/accounts)

## Environment Variables

Required variables (see [.env.example](.env.example)):

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `SOLANA_RPC_URL`: Server-side Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_RPC_URL`: Client-side Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_NETWORK`: Network (mainnet-beta/devnet/testnet)
- `JWT_SECRET`: Secret for JWT signing (generate with `openssl rand -hex 32`)
- `CRON_SECRET`: Secret for protecting cron endpoints
- `TELEGRAM_BOT_TOKEN`: Telegram bot token from @BotFather
- `TELEGRAM_BOT_USERNAME`: Bot username without @
- `NEXT_PUBLIC_APP_URL`: App URL for Telegram connection links

## Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Copy contents of [supabase/schema.sql](supabase/schema.sql) to SQL Editor
3. Execute to create all tables, indexes, policies, and triggers
4. Sign in to app with your wallet
5. Set yourself as admin: `UPDATE users SET is_admin = true WHERE wallet_address = 'YOUR_WALLET';`

See [supabase/README.md](supabase/README.md) for detailed instructions.

## Cron Job Configuration

The monitoring cron job is configured in [vercel.json](vercel.json) to run every 15 minutes on Vercel. For local testing:

```bash
# Test the monitoring endpoint manually
curl http://localhost:3000/api/cron/monitor-idls \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Testing Notifications

### Slack
Users can test their Slack webhook from Settings page, which calls:
```bash
POST /api/user/settings
```

### Telegram
Users connect Telegram by:
1. Click "Connect Telegram" in Settings
2. App generates connection token
3. User clicks deep link to Telegram bot
4. Bot verifies token and saves chat_id

## Important Considerations

### RPC Rate Limiting
- Default public Solana RPC has rate limits
- For production, use paid RPC (Helius, QuickNode, etc.)
- Configure in `SOLANA_RPC_URL` environment variable
- IDL fetcher includes retry logic with exponential backoff

### IDL Hash Calculation
SHA-256 hash is calculated from stringified IDL JSON to detect changes. The hash is used to avoid creating duplicate snapshots.

### Notification Tracking
Changes have separate notification flags for each channel:
- `slack_notified` / `slack_notified_at`
- `telegram_user_notified` / `telegram_user_notified_at`

This allows partial failures and retries per channel.

### Admin vs Regular Users
- **Admins**: Can add/edit/delete monitored programs
- **Regular users**: Can only view programs and manage their own watchlist
- Admin status stored in `users.is_admin` boolean field
- Frontend checks admin status via `/api/admin/check`

## File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── cron/         # Cron job endpoints
│   │   ├── admin/        # Admin-only endpoints
│   │   ├── programs/     # Program CRUD
│   │   ├── changes/      # Change history
│   │   ├── watchlist/    # Watchlist management
│   │   ├── telegram/     # Telegram bot webhook & connection
│   │   └── user/         # User settings
│   └── [pages]/          # Page components
├── components/            # React components
│   ├── ui/               # Radix UI base components
│   └── [features]/       # Feature-specific components
└── lib/                  # Core libraries
    ├── auth/             # Authentication logic
    ├── db/               # Database operations
    ├── monitoring/       # IDL monitoring & change detection
    ├── notifications/    # Slack & Telegram notifications
    ├── solana/           # Solana/Anchor IDL fetching
    ├── telegram/         # Telegram bot utilities
    └── supabase.ts       # Supabase clients & types
```

## TypeScript Types

Core types are defined in [src/lib/supabase.ts](src/lib/supabase.ts):
- `MonitoredProgram`
- `IdlSnapshot`
- `IdlChange`
- `User`
- `UserWatchlist`
- `MonitoringLog`

IDL structure types in [src/lib/solana/idl-fetcher.ts](src/lib/solana/idl-fetcher.ts):
- `SolanaIdl`
- `IdlAccount`
