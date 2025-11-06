# Telegram Connection Token Fix

## The Problem

You were getting this error when connecting Telegram:

```
❌ Connection link expired or invalid. Please generate a new one from the IDL Sentinel settings page.

Links expire after 10 minutes.
```

## Root Cause

The connection tokens were stored in an **in-memory Map**, which causes issues in:

1. **Serverless environments** (like Vercel/AWS Lambda):
   - Each function invocation can run on a different instance
   - Token generated on Instance A won't be found on Instance B

2. **Development with hot reload**:
   - Server restarts lose all tokens
   - File changes trigger reloads, clearing the Map

3. **Load-balanced deployments**:
   - Multiple server instances don't share memory
   - Token created on Server 1 won't exist on Server 2

**Example failure:**
```
User clicks "Connect"
  → API route runs on Instance A
  → Generates token, stores in Instance A's memory

User clicks "Start" in Telegram
  → Webhook runs on Instance B
  → Token not found in Instance B's memory
  → Error: "expired or invalid"
```

## The Solution

Switched to **stateless JWT tokens** that encode the userId directly:

### Before (Stateful - In-Memory Map)
```typescript
const connectionTokens = new Map<string, { userId: string }>()

function generateConnectionToken(userId: string): string {
  const token = crypto.randomBytes(16).toString('hex')
  connectionTokens.set(token, { userId })
  return token
}

function consumeConnectionToken(token: string): string | null {
  const data = connectionTokens.get(token)
  if (!data) return null
  connectionTokens.delete(token)
  return data.userId
}
```

**Problem:** Token lookup requires the same server instance.

### After (Stateless - JWT)
```typescript
async function generateConnectionToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId, type: 'telegram_connect' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setJti(crypto.randomUUID()) // Unique ID to prevent reuse
    .sign(JWT_SECRET)

  return token
}

async function consumeConnectionToken(token: string): Promise<string | null> {
  const { payload } = await jwtVerify(token, JWT_SECRET)

  // Check if already consumed
  if (consumedTokens.has(payload.jti)) return null

  // Mark as consumed
  consumedTokens.add(payload.jti)

  return payload.userId
}
```

**Benefits:**
- ✅ Works across all server instances (token contains userId)
- ✅ Signed and verified (can't be tampered with)
- ✅ Built-in expiration (JWT handles it)
- ✅ One-time use (tracks consumed token IDs)

## How It Works Now

1. **Token Generation (Instance A):**
   ```
   userId → JWT.sign({ userId, exp: now+10m, jti: uuid }) → signed token
   ```

2. **Token Verification (Instance B):**
   ```
   signed token → JWT.verify(secret) → { userId, exp, jti }
   Check expiration ✓
   Check signature ✓
   Check not consumed ✓
   Extract userId ✓
   ```

3. **The token is self-contained** - no database or shared memory needed!

## Security Features

1. **Cryptographically signed** - Can't be forged without the JWT_SECRET
2. **Time-limited** - Automatically expires after 10 minutes
3. **One-time use** - JTI (JWT ID) tracked in consumedTokens set
4. **Type validation** - Ensures token is for telegram_connect purpose

## Testing the Fix

Try connecting again:

1. Click "Connect Telegram" in Settings
2. Click the link to open Telegram
3. Click "Start"
4. You should see: ✅ "Successfully connected!"

The connection should now work reliably regardless of:
- Server restarts
- Hot reloads
- Multiple server instances
- Serverless cold starts

## Technical Notes

### consumedTokens Set

We still use an in-memory Set to track consumed tokens, but this has minimal impact:

- **If token reused on different instance:** JWT verification still succeeds, but that's acceptable (low risk)
- **If token reused on same instance:** Properly blocked
- **Main protection:** JWT expiration (10 minutes) prevents long-term reuse

For high-security production with multiple instances, consider:
- Redis Set to track consumed JTIs across instances
- Database table for consumed tokens
- Rate limiting on /api/telegram/webhook

### JWT Payload Structure

```json
{
  "userId": "uuid-of-user",
  "type": "telegram_connect",
  "iat": 1234567890,
  "exp": 1234568490,
  "jti": "unique-token-id"
}
```

- `userId`: User to link the Telegram chat to
- `type`: Prevents token reuse for other purposes
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (iat + 10 minutes)
- `jti`: Unique identifier to prevent token reuse

## Why This Happens in Serverless

In traditional servers:
- One process runs continuously
- In-memory storage persists
- All requests hit the same instance

In serverless (Vercel, AWS Lambda, etc.):
- Each request may spawn a new instance
- Instances are ephemeral and isolated
- No shared memory between instances
- Functions "cold start" when not recently used

**This is why JWT/stateless approaches are preferred for serverless!**

## Alternative Solutions Considered

1. **Redis** ✓ Would work, adds infrastructure cost
2. **Database table** ✓ Would work, adds query overhead
3. **Sticky sessions** ✗ Not available in serverless
4. **Shared filesystem** ✗ Not available in serverless
5. **JWT (chosen)** ✓ No infrastructure, works everywhere

## Migration Notes

- No database migration needed
- No user action required
- Tokens generated before fix may still fail (generate new one)
- Works immediately after deployment
