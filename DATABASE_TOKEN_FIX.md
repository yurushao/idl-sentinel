# Database-Backed Telegram Connection Tokens

## The Problem

Connection tokens were failing with "expired or invalid" error because:

1. **In-memory Map approach:** Tokens lost on server restart or different instance
2. **JWT approach:** Still had issues with consumed token tracking across instances

## The Solution

Store connection tokens **directly in Supabase**, which provides:

✅ **Persistence** - Tokens survive server restarts
✅ **Multi-instance support** - All instances access same database
✅ **Reliable state** - Used/unused status always accurate
✅ **Automatic cleanup** - Cron job removes expired tokens

## Changes Made

### 1. Database Migration (`010_telegram_connection_tokens.sql`)

Created a new table to store connection tokens:

```sql
CREATE TABLE telegram_connection_tokens (
  id UUID PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ
);
```

**Indexes for performance:**
- `idx_telegram_tokens_token` - Fast token lookup (only unused tokens)
- `idx_telegram_tokens_expires` - Fast cleanup of expired tokens

### 2. Updated Token Functions (`src/lib/telegram/connection-tokens.ts`)

**Generate Token:**
```typescript
async function generateConnectionToken(userId: string): Promise<string> {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex')

  // Store in database
  await supabaseAdmin
    .from('telegram_connection_tokens')
    .insert({
      token,
      user_id: userId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false
    })

  return token
}
```

**Consume Token:**
```typescript
async function consumeConnectionToken(token: string): Promise<string | null> {
  // Fetch from database
  const tokenData = await supabaseAdmin
    .from('telegram_connection_tokens')
    .select('*')
    .eq('token', token)
    .single()

  // Validate: not used, not expired
  if (tokenData.used || new Date() > new Date(tokenData.expires_at)) {
    return null
  }

  // Mark as used
  await supabaseAdmin
    .from('telegram_connection_tokens')
    .update({ used: true, used_at: new Date() })
    .eq('token', token)

  return tokenData.user_id
}
```

**Cleanup Function:**
```typescript
async function cleanupExpiredTokens(): Promise<void> {
  // Delete expired tokens
  await supabaseAdmin
    .from('telegram_connection_tokens')
    .delete()
    .lt('expires_at', new Date())

  // Delete used tokens older than 1 hour
  await supabaseAdmin
    .from('telegram_connection_tokens')
    .delete()
    .eq('used', true)
    .lt('used_at', new Date(Date.now() - 60 * 60 * 1000))
}
```

### 3. Added Cleanup to Cron Job (`src/app/api/cron/monitor-idls/route.ts`)

The monitoring cron job now cleans up old tokens:

```typescript
// After sending notifications
await cleanupExpiredTokens()
```

## How to Test

### Step 1: Apply the Database Migration

In your **Supabase SQL Editor**, run:

```sql
-- Create table for Telegram connection tokens
CREATE TABLE IF NOT EXISTS telegram_connection_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token
  ON telegram_connection_tokens(token)
  WHERE used = FALSE;

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires
  ON telegram_connection_tokens(expires_at)
  WHERE used = FALSE;

-- Enable RLS
ALTER TABLE telegram_connection_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access (API routes only)
CREATE POLICY "Service role full access" ON telegram_connection_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Step 2: Verify Migration

Check that the table was created:

```sql
SELECT * FROM telegram_connection_tokens LIMIT 1;
```

Should return an empty result (no error).

### Step 3: Test the Connection Flow

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Go to Settings** and sign in

3. **Click "Connect Telegram"**
   - You should see the connection URL generated
   - Link opens in new tab

4. **Check the database:**
   ```sql
   SELECT token, user_id, expires_at, used
   FROM telegram_connection_tokens
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - You should see your token with `used = false`

5. **Click "Start" in Telegram**
   - Bot should respond: "✅ Successfully connected!"

6. **Check the database again:**
   ```sql
   SELECT token, user_id, expires_at, used, used_at
   FROM telegram_connection_tokens
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Token should now have `used = true` and `used_at` timestamp

7. **Verify in Settings:**
   - Should show "Connected" with your Telegram username
   - Can send test notification

### Step 4: Test Token Expiration

1. Generate a token but DON'T use it
2. Wait 10 minutes (or update expires_at in database for faster test)
3. Try to use the token
4. Should see: "Connection link expired or invalid"

### Step 5: Test Token Reuse Protection

1. Generate a token
2. Use it (click Start in Telegram)
3. Try to use the same token again (send `/start TOKEN` in Telegram)
4. Should see: "Connection link expired or invalid"

## Debugging

### Check Generated Tokens

```sql
SELECT
  token,
  user_id,
  created_at,
  expires_at,
  used,
  used_at,
  CASE
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN used = true THEN 'USED'
    ELSE 'VALID'
  END as status
FROM telegram_connection_tokens
ORDER BY created_at DESC
LIMIT 10;
```

### Check Logs

When you click "Connect Telegram", check your server logs for:

```
Generated connection token for user [UUID], expires at [timestamp]
```

When you click "Start" in Telegram, check logs for:

```
Token consumed successfully for user [UUID]
```

### Common Issues

**"Token not found" in logs:**
- Token wasn't saved to database
- Check SUPABASE_SERVICE_ROLE_KEY is set correctly
- Check migration was applied

**"Token already used":**
- You clicked "Start" multiple times
- Generate a new token by clicking "Connect Telegram" again

**"Token expired":**
- More than 10 minutes passed since generation
- Generate a new token

## Performance Considerations

### Database Queries

Each connection attempt makes:
- 1 SELECT (check token)
- 1 UPDATE (mark as used)
- 1 UPDATE (update user's telegram_chat_id)

**Total: 3 queries** - very acceptable for an infrequent operation.

### Indexes

Indexes ensure fast lookups even with thousands of tokens:
- Token lookup: O(log n) via B-tree index
- Cleanup: O(log n) to find expired tokens

### Cleanup

Cron job runs periodically to delete:
- Expired tokens (older than 10 minutes)
- Used tokens (older than 1 hour)

This keeps the table small and queries fast.

## Comparison with Previous Approaches

| Approach | Pros | Cons | Works in Serverless? |
|----------|------|------|---------------------|
| In-memory Map | Fast, simple | Lost on restart, instance-specific | ❌ No |
| JWT | Stateless, portable | Complex reuse tracking | ⚠️ Partial |
| **Database** | Reliable, persistent | Extra queries | ✅ Yes |

## Security

1. **Token generation:** Cryptographically random (32 bytes = 256 bits)
2. **Expiration:** Automatic after 10 minutes
3. **One-time use:** Database tracks used status
4. **Access control:** RLS policy restricts to service role only
5. **Cascade delete:** Tokens deleted when user is deleted

## Files Changed

- ✅ `supabase/migrations/010_telegram_connection_tokens.sql` - New table
- ✅ `src/lib/telegram/connection-tokens.ts` - Database-backed functions
- ✅ `src/app/api/cron/monitor-idls/route.ts` - Added cleanup

## Next Steps

After confirming the connection works:

1. Set up webhook (if not already done) - see TELEGRAM_SETUP.md
2. Test notifications by:
   - Adding a program to watchlist
   - Triggering a change (or waiting for cron)
   - Checking Telegram for notification

## Rollback

If you need to rollback:

```sql
-- Remove the table
DROP TABLE IF EXISTS telegram_connection_tokens;
```

Then revert code to previous commit.

## Success Criteria

✅ Token generation saves to database
✅ Token consumption reads from database
✅ Used tokens cannot be reused
✅ Expired tokens are rejected
✅ Connection completes successfully
✅ Telegram shows "Connected" in Settings
✅ Test notification works
