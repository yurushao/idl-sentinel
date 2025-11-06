# Environment Variables Setup Guide

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values** (see sections below)

3. **Restart your dev server:**
   ```bash
   pnpm dev
   ```

## Required Variables

### 1. Supabase Configuration

**Where to get these:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important:** Keep `SUPABASE_SERVICE_ROLE_KEY` secret! It has full database access.

### 2. JWT Secret (Authentication)

**Generate a secure secret:**
```bash
openssl rand -hex 32
```

```bash
JWT_SECRET=your_generated_32_character_secret_here
```

⚠️ **Important:** Must be at least 32 characters. Keep this secret!

### 3. Cron Secret (API Protection)

**Generate a secure secret:**
```bash
openssl rand -hex 32
```

```bash
CRON_SECRET=your_generated_secret_for_cron_jobs
```

This protects your `/api/cron/*` endpoints from unauthorized access.

## Optional Variables

### 4. Solana Configuration

**Default values work fine, but you can customize:**

```bash
# Network to use
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta  # or devnet, testnet

# Client-side RPC (used in browser)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Server-side RPC (used in monitoring)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Why two RPC URLs?**
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Used by wallet adapter (browser/client)
- `SOLANA_RPC_URL` - Used by monitoring cron jobs (server)
- They can be different (e.g., use a paid RPC for server for better reliability)

**Recommended RPC Providers:**
- Free: https://api.mainnet-beta.solana.com
- Paid (better performance):
  - https://www.helius.dev/
  - https://www.quicknode.com/
  - https://www.alchemy.com/solana

### 5. Telegram Notifications (Admin Only)

**Optional:** For global admin notifications to a Telegram channel.

**Setup:**
1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Add to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

**Note:** This is for admin/global notifications. User-specific Slack notifications are configured per-user in the Settings page (no env vars needed).

## Verification

### Check Your Configuration

```bash
# Make sure .env.local exists
ls -la .env.local

# Verify critical variables are set (don't show values)
node -e "
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'JWT_SECRET', 'CRON_SECRET'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('❌ Missing:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required variables are set');
}
"
```

### Test Connections

**1. Test Supabase Connection:**
```bash
curl "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

**2. Test Solana RPC:**
```bash
curl https://api.mainnet-beta.solana.com \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

**3. Test App:**
```bash
pnpm dev
# Visit http://localhost:3000
```

## Security Best Practices

### ✅ DO:
- Use strong, randomly generated secrets (32+ characters)
- Keep `.env.local` in `.gitignore` (already configured)
- Use different secrets for development and production
- Rotate secrets periodically
- Use paid RPC providers for production (better reliability)

### ❌ DON'T:
- Commit `.env.local` to git
- Share your `SUPABASE_SERVICE_ROLE_KEY` publicly
- Use simple/guessable secrets
- Reuse secrets across projects
- Expose `CRON_SECRET` publicly

## Troubleshooting

### "Supabase connection failed"
- Check `NEXT_PUBLIC_SUPABASE_URL` format: `https://xxxxx.supabase.co`
- Verify keys are correct (no extra spaces)
- Check Supabase project is active

### "Authentication not working"
- Ensure `JWT_SECRET` is set and at least 32 characters
- Clear browser cookies and try again
- Restart dev server after changing `.env.local`

### "Cron job returns 401 Unauthorized"
- Check `CRON_SECRET` matches in both:
  - `.env.local`
  - Vercel environment variables (for production)

### "Wallet won't connect"
- Check `NEXT_PUBLIC_SOLANA_NETWORK` is valid
- Try using public RPC: `https://api.mainnet-beta.solana.com`
- Check browser console for errors

## Production Deployment

When deploying to Vercel:

1. **Add all variables to Vercel:**
   - Go to Project Settings → Environment Variables
   - Add each variable from `.env.local`
   - Set "Environment": Production, Preview, Development (as needed)

2. **Don't commit secrets:**
   - `.env.local` is gitignored ✅
   - Use Vercel UI to set production secrets

3. **Verify deployment:**
   - Check Vercel logs for missing env vars
   - Test authentication on deployed URL
   - Verify cron jobs are protected

## Environment Variable Reference

| Variable | Required | Used For | Where |
|----------|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Database connection | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Public database access | Client & Server |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Admin database access | Server only |
| `JWT_SECRET` | ✅ Yes | User authentication | Server only |
| `CRON_SECRET` | ✅ Yes | Protect cron endpoints | Server only |
| `NEXT_PUBLIC_SOLANA_NETWORK` | ⚪ Optional | Solana network | Client |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | ⚪ Optional | Wallet connection | Client |
| `SOLANA_RPC_URL` | ⚪ Optional | IDL monitoring | Server only |
| `TELEGRAM_BOT_TOKEN` | ⚪ Optional | Telegram notifications | Server only |
| `TELEGRAM_CHAT_ID` | ⚪ Optional | Telegram notifications | Server only |

## Quick Commands

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32

# Check what's set (safe - doesn't show values)
node -e "console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('JWT') || k.includes('CRON')).join('\n'))"

# Copy example
cp .env.example .env.local

# Edit
nano .env.local  # or use your favorite editor

# Restart dev server
pnpm dev
```

## Support

If you're still having issues:
1. Check this guide again
2. Review the [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
3. Check the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for database setup
4. Open an issue with your error message (don't include secrets!)
