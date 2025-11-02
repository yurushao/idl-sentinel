# IDL Sentinel

A comprehensive monitoring system for Solana program IDL (Interface Definition Language) changes. Track modifications to your Solana programs in real-time and receive notifications when changes are detected.

## Features

- 🔍 **Real-time IDL Monitoring**: Automatically fetch and compare IDL changes from Solana programs
- 📊 **Change Detection**: Intelligent analysis of instruction, type, account, and error changes
- 🚨 **Severity Classification**: Categorize changes by impact level (low, medium, high, critical)
- 📱 **Telegram Notifications**: Get instant alerts about important changes
- 🌐 **Web Dashboard**: Beautiful interface to manage programs and view changes
- ⏰ **Automated Monitoring**: Scheduled checks via Vercel cron jobs
- 📈 **Analytics**: Track monitoring statistics and change trends

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Solana Web3.js, Anchor
- **Deployment**: Vercel
- **Notifications**: Telegram Bot API

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
   
   # Security
   CRON_SECRET=your_random_secret_for_cron_jobs
   
   # Development
   NODE_ENV=development
   ```

3. **Set up the database**:
   The database schema is automatically created via Supabase migrations. The following tables will be created:
   - `monitored_programs`: Programs being monitored
   - `idl_snapshots`: Historical IDL snapshots
   - `idl_changes`: Detected changes with severity
   - `notification_settings`: Telegram configuration
   - `monitoring_logs`: System logs

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open the application**:
   Visit [http://localhost:3000](http://localhost:3000)

## Usage

### Adding Programs to Monitor

1. Navigate to the "Programs" page
2. Click "Add Program"
3. Enter the Solana program ID and details
4. The system will automatically start monitoring for IDL changes

### Setting Up Notifications

1. Go to "Settings" page
2. Create a Telegram bot via @BotFather
3. Get your chat ID from @userinfobot
4. Configure the bot token and chat ID
5. Test the notification to ensure it works

### Viewing Changes

- **Dashboard**: Overview of recent changes and statistics
- **Changes**: Detailed view of all detected changes with filtering
- **Programs**: Manage your monitored programs

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
   - `CRON_SECRET`

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

### Programs
- `GET /api/programs` - List all programs
- `POST /api/programs` - Add new program
- `GET /api/programs/[id]` - Get program details
- `PUT /api/programs/[id]` - Update program
- `DELETE /api/programs/[id]` - Delete program

### Changes
- `GET /api/changes` - List changes with filtering
- `GET /api/programs/[id]/changes` - Get changes for specific program
- `GET /api/programs/[id]/snapshots` - Get IDL snapshots

### Monitoring
- `POST /api/cron/monitor-idls` - Trigger monitoring (protected)
- `GET /api/monitoring/stats` - Get monitoring statistics

### Notifications
- `GET /api/notifications/settings` - Get notification settings
- `PUT /api/notifications/settings` - Update settings
- `POST /api/notifications/test` - Test notification
- `POST /api/notifications/send` - Send pending notifications

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

- [ ] Discord notifications
- [ ] Email notifications
- [ ] Advanced filtering and search
- [ ] Change history visualization
- [ ] Multi-network support (Devnet, Testnet)
- [ ] Program dependency tracking
- [ ] Custom webhook notifications
- [ ] Change approval workflows