# IDL Sentinel

Track modifications to Solana program IDLs in real-time and receive notifications when changes are detected.

## Features

- **Real-time IDL Monitoring**: Automatically fetch and compare IDL changes from Solana programs
- **Change Detection**: Intelligent analysis of instruction, type, account, and error changes
- **Severity Classification**: Categorize changes by impact level (low, medium, high, critical)
- **Multi-Channel Notifications**: Get alerts via Telegram and Slack
- **Snapshot Inspection**: View and download full IDL snapshots

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project

### Installation

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd idl-sentinel
   pnpm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables in `.env.local`

3. **Set up the database**:

   See [supabase/README.md](supabase/README.md) for complete database setup instructions.

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

## User Roles & Permissions

### Admin Users

- **Add/Edit/Delete** monitored programs
- Full access to all features
- Set via SQL: `UPDATE users SET is_admin = true WHERE wallet_address = 'YOUR_WALLET'`

### Regular Users

- **View** all monitored programs
- **Subscribe** to programs of interest via watchlist
- **Receive notifications** for watched programs only
- Configure personal Slack/Telegram notification settings
- Cannot add or modify programs (admin-only)

## Notifications

- **Slack**: User-configurable webhook URLs
- **Telegram**: Shared bot with per-user connections
