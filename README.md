# IDL Sentinel

A comprehensive monitoring system for Solana program IDL (Interface Definition Language) changes. Track modifications to your Solana programs in real-time and receive notifications when changes are detected.

## Screenshots

_Coming soon: Dashboard, Diff Viewer, and Snapshot Inspector screenshots_

## Features

- 🔍 **Real-time IDL Monitoring**: Automatically fetch and compare IDL changes from Solana programs
- 📊 **Change Detection**: Intelligent analysis of instruction, type, account, and error changes
- 🚨 **Severity Classification**: Categorize changes by impact level (low, medium, high, critical)
- 🔐 **Wallet Authentication**: Sign in with Solana wallets (Phantom, Solflare, etc.)
- 📱 **Multi-Channel Notifications**: Get alerts via Telegram and Slack
- 🎨 **Enhanced Diff Viewer**: Professional side-by-side or unified diff view with syntax highlighting
- 📥 **Snapshot Inspection**: View and download full IDL snapshots with syntax highlighting
- 🌐 **Responsive Dashboard**: Beautiful interface optimized for desktop, tablet, and mobile
- ⏰ **Automated Monitoring**: Scheduled checks via Vercel cron jobs
- 📈 **Analytics**: Track monitoring statistics and change trends

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Solana Web3.js, Anchor, Wallet Adapter
- **UI Components**: Radix UI, Lucide Icons
- **Code Highlighting**: React Syntax Highlighter, React Diff Viewer
- **Deployment**: Vercel
- **Notifications**: Telegram Bot API, Slack Webhooks

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project
- Telegram bot (optional, for notifications)

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
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Solana Configuration
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

   # Authentication
   JWT_SECRET=your_jwt_secret_for_wallet_auth

   # Notifications (optional)
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   SLACK_WEBHOOK_URL=your_slack_webhook_url

   # Security
   CRON_SECRET=your_random_secret_for_cron_jobs

   # Development
   NODE_ENV=development
   ```

3. **Set up the database**:
   The database schema is automatically created via Supabase migrations. The following tables will be created:
   - `users`: Authenticated users via wallet
   - `monitored_programs`: Programs being monitored
   - `idl_snapshots`: Historical IDL snapshots
   - `idl_changes`: Detected changes with severity
   - `user_settings`: User notification preferences (Telegram, Slack)
   - `monitoring_logs`: System logs and activity tracking

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open the application**:
   Visit [http://localhost:3000](http://localhost:3000)

## Usage

### Authentication

1. Click "Connect Wallet" in the navigation bar
2. Select your preferred Solana wallet (Phantom, Solflare, etc.)
3. Sign the authentication message to verify ownership
4. Access protected features and personalized dashboard

### Adding Programs to Monitor

1. Navigate to the "Programs" page
2. Click "Add Program"
3. Enter the Solana program ID and details
4. The system will automatically start monitoring for IDL changes

### Viewing IDL Snapshots

On the program detail page, you can:
- **View**: Click the eye icon to see the full IDL with syntax highlighting
- **Download**: Export the IDL snapshot as a formatted JSON file
- **Compare**: See changes between snapshots with enhanced diff viewer

### Viewing Changes

- **Dashboard**: Overview of recent changes and statistics
- **Changes Page**:
  - Detailed view of all detected changes with filtering
  - Professional diff viewer showing before/after comparisons
  - Toggle between split-view and unified-view modes
  - Syntax highlighting for better readability
- **Programs**: Manage your monitored programs and view their history

### Setting Up Notifications

#### Telegram
1. Go to "Settings" page
2. Create a Telegram bot via @BotFather
3. Get your chat ID from @userinfobot or @RawDataBot
4. Configure the bot token and chat ID
5. Test the notification to ensure it works

#### Slack
1. Create an incoming webhook in your Slack workspace
2. Add the webhook URL in Settings
3. Configure notification preferences
4. Test to verify delivery

## Deployment

### Vercel Deployment

1. **Connect to Vercel**:
   ```bash
   npx vercel
   ```

2. **Set environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SOLANA_RPC_URL`
   - `JWT_SECRET`
   - `CRON_SECRET`
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `SLACK_WEBHOOK_URL` (optional)

3. **Configure cron jobs**:
   The `vercel.json` file includes cron configuration for hourly monitoring.

4. **Deploy**:
   ```bash
   npx vercel --prod
   ```

### Manual Monitoring

You can manually trigger monitoring via API:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/monitor-idls \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## API Endpoints

### Authentication
- `POST /api/auth/nonce` - Get nonce for wallet signature
- `POST /api/auth/verify` - Verify signature and create session
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/signout` - Sign out and clear session

### Programs
- `GET /api/programs` - List all programs
- `POST /api/programs` - Add new program (requires auth)
- `GET /api/programs/[id]` - Get program details
- `PUT /api/programs/[id]` - Update program (requires auth)
- `DELETE /api/programs/[id]` - Delete program (requires auth)

### Changes
- `GET /api/changes` - List changes with filtering
- `GET /api/programs/[id]/changes` - Get changes for specific program
- `GET /api/programs/[id]/snapshots` - Get IDL snapshots for a program

### Monitoring
- `POST /api/cron/monitor-idls` - Trigger monitoring (protected by CRON_SECRET)
- `GET /api/monitoring/stats` - Get monitoring statistics

### User Settings
- `GET /api/user/settings` - Get user notification settings
- `PUT /api/user/settings` - Update notification preferences

### Telegram Integration
- `POST /api/telegram/connect` - Connect Telegram account
- `POST /api/telegram/webhook` - Telegram webhook endpoint

## Architecture

### Change Detection

The system uses sophisticated algorithms to detect and classify IDL changes:

1. **Instruction Changes**: New, removed, or modified instructions
2. **Type Changes**: Struct and enum modifications
3. **Account Changes**: Account structure updates
4. **Error Changes**: Error code modifications

### Severity Classification

Changes are automatically classified by impact:

- **Critical**: Breaking changes that affect existing functionality
- **High**: Significant changes requiring attention
- **Medium**: Notable changes with moderate impact
- **Low**: Minor changes or additions

### Monitoring Flow

1. Scheduled cron job triggers monitoring
2. Fetch current IDL from Solana blockchain
3. Compare with latest snapshot
4. Detect and classify changes
5. Store results and send notifications
6. Update monitoring logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

## Roadmap

### Completed ✅
- [x] Wallet authentication (Solana wallets)
- [x] Telegram notifications
- [x] Slack notifications
- [x] Enhanced diff viewer with syntax highlighting
- [x] Snapshot inspection and download
- [x] Responsive mobile design
- [x] Advanced filtering and search

### Planned 🚀
- [ ] Discord notifications
- [ ] Email notifications
- [ ] Change history visualization graphs
- [ ] Multi-network support (Devnet, Testnet)
- [ ] Program dependency tracking
- [ ] Custom webhook notifications
- [ ] Change approval workflows
- [ ] Snapshot comparison tool
- [ ] Export reports (PDF, CSV)
- [ ] Team collaboration features
- [ ] API rate limiting and quotas