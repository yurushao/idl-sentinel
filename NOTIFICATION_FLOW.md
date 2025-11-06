# IDL Change Detection & Notification Flow

## Complete Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRON TRIGGER (Every 5 minutes on Vercel)                    │
│    → GET /api/cron/monitor-idls                                 │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MONITORING PHASE                                             │
│    → monitorPrograms() in src/lib/monitoring/monitor.ts        │
│                                                                  │
│    For each active program:                                     │
│    a) Fetch current IDL from Solana blockchain                  │
│    b) Calculate hash of IDL                                     │
│    c) Compare with latest snapshot in database                  │
│    d) If different → detect & save changes                      │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CHANGE DETECTION & STORAGE                                   │
│    → detectChanges() in src/lib/monitoring/change-detector.ts  │
│    → createChanges() in src/lib/db/changes.ts                  │
│                                                                  │
│    Detects:                                                      │
│    - New/removed/modified instructions                           │
│    - New/removed/modified types                                  │
│    - New/removed/modified accounts                               │
│    - New/removed/modified errors                                 │
│                                                                  │
│    Saves to database:                                            │
│    - idl_changes table                                           │
│    - Fields: program_id, change_type, severity, description     │
│    - Flags: notified=false, slack_notified=false                │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. NOTIFICATION PHASE - TELEGRAM (Legacy/Admin)                │
│    → sendPendingNotifications() in telegram.ts                 │
│                                                                  │
│    - Finds changes where notified=false                         │
│    - Sends to global Telegram channel (admin notifications)     │
│    - Marks notified=true                                        │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. NOTIFICATION PHASE - SLACK (User Watchlists)                │
│    → sendWatchlistNotifications() in slack.ts                  │
│                                                                  │
│    This is where YOUR code does the magic! ✨                   │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ DETAILED SLACK NOTIFICATION FLOW                                │
└─────────────────────────────────────────────────────────────────┘

## Step 5 Detailed Breakdown

### Step 5.1: Query Unnotified Changes
```typescript
// src/lib/notifications/slack.ts:183-194
const { data: changes } = await supabaseAdmin
  .from('idl_changes')
  .select(`
    *,
    monitored_programs!inner(id, name, program_id)
  `)
  .eq('slack_notified', false)  // ← Only unsent changes
  .order('detected_at', { ascending: true })
```

**What happens:**
- Queries `idl_changes` table
- Filters for `slack_notified = false` (changes not yet sent via Slack)
- Joins with `monitored_programs` to get program details
- Returns ALL changes that need Slack notifications

**Example result:**
```javascript
[
  {
    id: "change-uuid-1",
    program_id: "prog-uuid-123",
    change_type: "instruction_added",
    severity: "medium",
    change_summary: "Added new instruction: transfer",
    monitored_programs: {
      id: "prog-uuid-123",
      name: "Jupiter Aggregator",
      program_id: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"
    },
    slack_notified: false
  },
  {
    id: "change-uuid-2",
    program_id: "prog-uuid-123",
    change_type: "type_modified",
    severity: "high",
    change_summary: "Modified type: SwapData",
    monitored_programs: { ... }
  }
]
```

### Step 5.2: Group Changes by Program
```typescript
// src/lib/notifications/slack.ts:206-215
const changesByProgram = new Map<string, any[]>()

for (const change of changes) {
  const programDbId = change.monitored_programs.id
  if (!changesByProgram.has(programDbId)) {
    changesByProgram.set(programDbId, [])
  }
  changesByProgram.get(programDbId)!.push(change)
}
```

**What happens:**
- Groups all changes by their program
- So if Jupiter has 5 changes, they're grouped together
- This allows sending ONE notification per program

**Example result:**
```javascript
Map {
  "prog-uuid-123" => [change1, change2, change3],  // Jupiter
  "prog-uuid-456" => [change4, change5]             // Meteora
}
```

### Step 5.3: For Each Program, Find Watchers
```typescript
// src/lib/notifications/slack.ts:218-224
for (const [programDbId, programChanges] of changesByProgram) {
  const programName = programChanges[0].monitored_programs.name
  const programId = programChanges[0].monitored_programs.program_id

  // Get users watching this program
  const watchers = await getUsersWatchingProgram(programDbId)
  // ...
}
```

**getUsersWatchingProgram() function:**
```typescript
// src/lib/notifications/slack.ts:132-165
export async function getUsersWatchingProgram(programId: string) {
  const { data } = await supabaseAdmin
    .from('user_watchlist')
    .select(`
      user_id,
      users!inner(
        id,
        wallet_address,
        slack_webhook_url
      )
    `)
    .eq('program_id', programId)
    .not('users.slack_webhook_url', 'is', null)  // ← Only users with webhooks

  return data.map(entry => ({
    userId: entry.users.id,
    walletAddress: entry.users.wallet_address,
    webhookUrl: entry.users.slack_webhook_url
  }))
}
```

**What happens:**
- Looks up `user_watchlist` table
- Finds all users watching THIS program
- Filters for users who have configured a Slack webhook
- Returns array of watchers with their webhook URLs

**Database query joins:**
```
user_watchlist (who's watching?)
    ↓ JOIN
users (what's their webhook URL?)
    ↓ FILTER
WHERE program_id = "prog-uuid-123"
  AND slack_webhook_url IS NOT NULL
```

**Example result:**
```javascript
[
  {
    userId: "user-uuid-1",
    walletAddress: "bot3...ZJyg",
    webhookUrl: "https://hooks.slack.com/services/T123/B456/xyz"
  },
  {
    userId: "user-uuid-2",
    walletAddress: "yuru1...CawdgE4ZCW",
    webhookUrl: "https://hooks.slack.com/services/T789/B012/abc"
  }
]
```

### Step 5.4: Format Slack Message
```typescript
// src/lib/notifications/slack.ts:237
const message = formatSlackMessage(programName, programId, programChanges)
```

**formatSlackMessage() function:**
```typescript
// src/lib/notifications/slack.ts:48-128
export function formatSlackMessage(
  programName: string,
  programId: string,
  changes: IdlChange[]
) {
  // Group changes by severity
  const changesBySeverity = {
    critical: changes.filter(c => c.severity === 'critical'),
    high: changes.filter(c => c.severity === 'high'),
    medium: changes.filter(c => c.severity === 'medium'),
    low: changes.filter(c => c.severity === 'low')
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 IDL Sentinel - Changes Detected'
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Program:*\n${programName}` },
        { type: 'mrkdwn', text: `*Total Changes:*\n${changes.length}` },
        { type: 'mrkdwn', text: `*Address:*\n\`${programId}\`` },
        { type: 'mrkdwn', text: `*Detected:*\n${timestamp}` }
      ]
    },
    // ... sections for each severity level
  ]

  return { text: '🚨 Changes detected', blocks }
}
```

**What happens:**
- Creates a rich Slack Block Kit message
- Shows program name, address, change count
- Groups changes by severity (critical → low)
- Lists up to 5 changes per severity level
- Formats with emojis and markdown

**Example message:**
```
🚨 IDL Sentinel - Changes Detected

Program: Jupiter Aggregator
Total Changes: 3
Address: JUP4Fb2...
Detected: 2025-11-05 12:30:45 UTC

🔴 High (1)
• Modified type: SwapData

🟡 Medium (2)
• Added new instruction: transfer
• Modified instruction: swap
```

### Step 5.5: Send to Each Watcher's Webhook
```typescript
// src/lib/notifications/slack.ts:239-254
let successfulSends = 0
for (const watcher of watchers) {
  const success = await sendSlackNotification(watcher.webhookUrl, message)

  if (success) {
    successfulSends++
    console.log(`Sent to user ${watcher.walletAddress.substring(0, 8)}...`)
  } else {
    result.failed++
  }

  // Rate limiting delay
  await new Promise(resolve => setTimeout(resolve, 200))
}
```

**sendSlackNotification() function:**
```typescript
// src/lib/notifications/slack.ts:14-42
export async function sendSlackNotification(
  webhookUrl: string,
  message: any
): Promise<boolean> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  })

  return response.ok
}
```

**What happens:**
- Loops through EACH user watching this program
- Sends the SAME formatted message to THEIR webhook
- 200ms delay between sends (rate limiting)
- Tracks successes and failures

**Example:**
```
User bot3...ZJyg watching Jupiter
  → POST https://hooks.slack.com/services/T123/B456/xyz
  → ✅ Delivered to bot3's Slack channel

User yuru1...CawdgE4ZCW watching Jupiter
  → POST https://hooks.slack.com/services/T789/B012/abc
  → ✅ Delivered to yuru1's Slack channel
```

### Step 5.6: Mark Changes as Notified
```typescript
// src/lib/notifications/slack.ts:256-266
if (successfulSends > 0) {
  const changeIds = programChanges.map(c => c.id)

  await supabaseAdmin
    .from('idl_changes')
    .update({
      slack_notified: true,
      slack_notified_at: new Date().toISOString()
    })
    .in('id', changeIds)

  result.sent += successfulSends
}
```

**What happens:**
- If at least ONE notification succeeded
- Mark ALL changes for this program as `slack_notified = true`
- Set `slack_notified_at` timestamp
- This prevents duplicate notifications

**Database update:**
```sql
UPDATE idl_changes
SET
  slack_notified = true,
  slack_notified_at = '2025-11-05 12:30:50+00'
WHERE id IN ('change-uuid-1', 'change-uuid-2', 'change-uuid-3')
```

### Step 5.7: Repeat for Next Program
```typescript
// src/lib/notifications/slack.ts:277-278
// Add delay between programs
await new Promise(resolve => setTimeout(resolve, 500))
```

**What happens:**
- 500ms delay between programs
- Then process next program's changes
- Continue until all programs processed

## Complete Flow Summary

```
CRON JOB (every 5 min)
    ↓
MONITOR ALL PROGRAMS
    ↓ (for each program)
FETCH IDL FROM BLOCKCHAIN
    ↓
COMPARE WITH LAST SNAPSHOT
    ↓
IF DIFFERENT:
    ↓
    DETECT CHANGES (what changed?)
    ↓
    SAVE TO DATABASE (idl_changes table)
    ↓
    SET slack_notified = false


NOTIFICATION TIME:
    ↓
QUERY: SELECT * FROM idl_changes WHERE slack_notified = false
    ↓
GROUP BY PROGRAM
    ↓ (for each program with changes)

    FIND WATCHERS:
    ↓
    SELECT users.slack_webhook_url
    FROM user_watchlist
    JOIN users ON users.id = user_watchlist.user_id
    WHERE user_watchlist.program_id = ?
      AND users.slack_webhook_url IS NOT NULL

    ↓
    FORMAT MESSAGE (Slack blocks)

    ↓ (for each watcher)
    SEND TO WATCHER'S WEBHOOK
    ↓
    POST https://hooks.slack.com/services/...

    ↓ (if any succeeded)
    UPDATE idl_changes SET slack_notified = true
```

## Key Points

### 1. **User-Specific Notifications**
- Each user gets notifications ONLY for programs THEY watch
- User A watching Jupiter → gets Jupiter notifications
- User B watching Meteora → gets Meteora notifications
- User C watching both → gets both notifications

### 2. **Personal Webhook URLs**
- Each user configures their OWN Slack webhook
- Notifications go to THEIR Slack workspace/channel
- No shared channels - fully private and personalized

### 3. **No Duplicate Notifications**
- Once `slack_notified = true`, change won't be sent again
- Separate tracking from Telegram notifications
- `notified` flag is for Telegram
- `slack_notified` flag is for Slack

### 4. **Rate Limiting**
- 200ms delay between webhook calls
- 500ms delay between programs
- Prevents hitting Slack API rate limits

### 5. **Error Handling**
- If notification fails for one user, continues to others
- If no watchers, still marks as notified (no infinite loop)
- Errors logged but don't crash the entire process

## Example Scenario

**Setup:**
- Alice watches Jupiter and Meteora, has Slack webhook configured
- Bob watches only Jupiter, has Slack webhook configured
- Carol watches Meteora, but NO Slack webhook (skipped)

**What Happens:**

1. **Cron runs, detects 3 changes in Jupiter, 2 changes in Meteora**

2. **Slack notification phase:**

   **Jupiter:**
   - Query: Who watches Jupiter? → Alice, Bob
   - Format message with 3 changes
   - Send to Alice's webhook ✅
   - Send to Bob's webhook ✅
   - Mark Jupiter changes as slack_notified=true

   **Meteora:**
   - Query: Who watches Meteora? → Alice (Carol has no webhook)
   - Format message with 2 changes
   - Send to Alice's webhook ✅
   - Mark Meteora changes as slack_notified=true

3. **Result:**
   - Alice receives 2 notifications (Jupiter + Meteora)
   - Bob receives 1 notification (Jupiter only)
   - Carol receives nothing (no webhook configured)

## How to Test

1. **Add a program to your watchlist**
2. **Configure your Slack webhook in Settings**
3. **Wait for the cron job** (or manually trigger IDL monitoring)
4. **Check your Slack channel** for notifications!

Or manually test:
```bash
# Trigger monitoring manually
curl -X GET http://localhost:3000/api/cron/monitor-idls \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
