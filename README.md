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

   a. Create a new Supabase project at [https://supabase.com](https://supabase.com)

   b. Open the SQL Editor in your Supabase dashboard

   c. Copy and paste the contents of `supabase/schema.sql` into the SQL editor and run it

   d. After first login with your wallet, set yourself as admin:
      ```sql
      UPDATE users SET is_admin = true
      WHERE wallet_address = 'YOUR_WALLET_ADDRESS';
      ```

   See `supabase/README.md` for detailed setup instructions.

   **Database Tables:**
   - `users`: Authenticated users via wallet
   - `monitored_programs`: Programs being monitored
   - `idl_snapshots`: Historical IDL snapshots
   - `idl_changes`: Detected changes with severity
   - `user_watchlist`: User program subscriptions
   - `telegram_connection_tokens`: Telegram auth tokens
   - `monitoring_logs`: System logs and activity tracking

4. **Run the development server**:
   ```bash
   pnpm dev
   ```
