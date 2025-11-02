# Solana IDL Monitor - Product Requirements & Technical Design

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Requirements](#product-requirements)
3. [Technical Architecture](#technical-architecture)
4. [Database Design](#database-design)
5. [Next.js Application Design](#nextjs-application-design)
6. [Rust IDL Monitor Service](#rust-idl-monitor-service)
7. [Notification System](#notification-system)
8. [Security Considerations](#security-considerations)
9. [Deployment Strategy](#deployment-strategy)
10. [Development Roadmap](#development-roadmap)

---

## Executive Summary

### Problem Statement
Solana program developers who depend on third-party programs face significant risks when those programs update their instruction interfaces. Without monitoring, breaking changes can cause runtime failures in production environments.

### Solution
A unified Next.js application that tracks IDL (Interface Definition Language) changes for specified Solana programs and alerts developers when modifications are detected. The monitoring logic runs as a Vercel cron job, enabling code reuse across the web UI, API, and monitoring service.

### Key Features
- Program monitoring configuration via web UI
- Automated IDL fetching from on-chain accounts (Vercel cron job)
- Change detection with diff analysis
- Telegram notifications for detected changes
- Historical tracking of IDL versions
- Visual diff viewer in web interface
- Unified TypeScript codebase for all components

### Architecture Benefits

**Unified Codebase:**
- Single language (TypeScript) across frontend, backend, and monitoring
- Shared utilities and types between components
- Easier maintenance and debugging
- Consistent code style and patterns

**Simplified Deployment:**
- One deployment target (Vercel)
- No separate server management for cron jobs
- Automatic scaling and edge optimization
- Built-in monitoring and logging

**Code Reuse:**
- IDL parsing logic shared between API and monitoring
- Database operations centralized in one place
- Notification service accessible from both API and cron
- Type safety across all components

**Developer Experience:**
- Single repository
- Unified testing strategy
- One set of dependencies to manage
- Hot reload for all components during development

### Architecture Comparison

| Aspect | Unified TypeScript (Chosen) | Split Rust + Next.js |
|--------|----------------------------|----------------------|
| **Languages** | TypeScript only | TypeScript + Rust |
| **Deployment** | Single Vercel deployment | Vercel + separate server |
| **Code Sharing** | Full sharing of utilities/types | No sharing, duplicate logic |
| **Maintenance** | Single codebase | Two codebases to maintain |
| **Complexity** | Low | Medium-High |
| **Infrastructure** | Vercel only | Vercel + cron server |
| **Cost** | Vercel Pro plan | Vercel + server costs |
| **Scaling** | Automatic (Vercel) | Manual server scaling |
| **Development Speed** | Fast (one ecosystem) | Slower (two ecosystems) |
| **Type Safety** | End-to-end | Separate type systems |
| **Learning Curve** | Lower (one language) | Higher (two languages) |

The unified TypeScript approach was chosen for its simplicity, maintainability, and developer experience, making it ideal for a monitoring service where rapid iteration and reliability are key.

### Code Reuse Example

Here's how the unified architecture enables powerful code reuse:

```typescript
// lib/solana/idl-fetcher.ts - Shared utility
export async function fetchIdlFromChain(programId: string) {
  // IDL fetching logic used by both API and cron
}

// app/api/cron/monitor-idls/route.ts - Cron job uses it
import { fetchIdlFromChain } from '@/lib/solana/idl-fetcher';

export async function GET() {
  const idl = await fetchIdlFromChain(program.program_id); // ✅ Reused
  // ... monitoring logic
}

// app/api/programs/[id]/idl/route.ts - API endpoint uses it too
import { fetchIdlFromChain } from '@/lib/solana/idl-fetcher';

export async function GET(request, { params }) {
  const idl = await fetchIdlFromChain(params.id); // ✅ Same code!
  return NextResponse.json({ idl });
}
```

**Benefits:**
- ✅ Single implementation, tested once
- ✅ Consistent behavior across all endpoints
- ✅ Easy to update and maintain
- ✅ Shared TypeScript types ensure type safety
- ✅ No data format conversion needed

---

## Product Requirements

### Functional Requirements

#### FR-1: Program Management
- **FR-1.1**: Users can add Solana program addresses to monitor
- **FR-1.2**: Users can provide a friendly name and description for each program
- **FR-1.3**: Users can activate/deactivate monitoring for specific programs
- **FR-1.4**: Users can delete programs from monitoring list
- **FR-1.5**: Users can view all monitored programs in a list/table view

#### FR-2: IDL Monitoring
- **FR-2.1**: System fetches IDLs from on-chain accounts (Anchor program IDL storage)
- **FR-2.2**: System runs periodic checks via Vercel Cron (default: every 6 hours)
  - **Note**: Vercel Cron is available on Pro and Enterprise plans
  - **Alternative**: GitHub Actions or external cron services for Hobby plan
- **FR-2.3**: System stores historical snapshots of each IDL version
- **FR-2.4**: System calculates hash of IDL for quick change detection
- **FR-2.5**: System connects to Solana Mainnet RPC endpoint

#### FR-3: Change Detection
- **FR-3.1**: System detects the following change types:
  - New instructions added
  - Instructions removed
  - Instruction arguments modified (type, name, order)
  - Account list modified (order, constraints, mutability)
  - New types/structs added or modified
- **FR-3.2**: System categorizes change severity:
  - **Critical**: Instruction removed, account order changed
  - **High**: Required argument added, account constraint changed
  - **Medium**: Instruction added, optional argument added
  - **Low**: Documentation changes, type alias changes
- **FR-3.3**: System generates detailed diff for each change

#### FR-4: Notifications
- **FR-4.1**: System sends Telegram notifications when changes are detected
- **FR-4.2**: Notifications include:
  - Program name and address
  - Change type and severity
  - Summary of changes
  - Link to web UI for detailed diff
- **FR-4.3**: Users can configure Telegram bot token and chat ID
- **FR-4.4**: Users can enable/disable notifications

#### FR-5: Web Interface
- **FR-5.1**: Dashboard showing:
  - List of monitored programs
  - Recent changes across all programs
  - System status (last check time, next check time)
- **FR-5.2**: Program detail page showing:
  - IDL history timeline
  - All detected changes for that program
- **FR-5.3**: Change detail page showing:
  - Side-by-side diff view
  - JSON diff of IDL
  - Change metadata (timestamp, severity)
- **FR-5.4**: Settings page for:
  - Telegram configuration
  - Monitoring interval configuration

### Non-Functional Requirements

#### NFR-1: Performance
- **NFR-1.1**: IDL fetching should complete within 30 seconds per program
- **NFR-1.2**: Web UI should load within 2 seconds
- **NFR-1.3**: API responses should return within 500ms (95th percentile)
- **NFR-1.4**: System should support monitoring up to 100 programs concurrently

#### NFR-2: Reliability
- **NFR-2.1**: System should retry failed IDL fetches up to 3 times
- **NFR-2.2**: System should handle RPC rate limits gracefully
- **NFR-2.3**: Monitoring service should have 99% uptime
- **NFR-2.4**: Database should have automated backups

#### NFR-3: Scalability
- **NFR-3.1**: Architecture should support horizontal scaling of monitoring workers
- **NFR-3.2**: Database should handle 10,000+ IDL snapshots efficiently
- **NFR-3.3**: System should support multiple users/teams in future

#### NFR-4: Maintainability
- **NFR-4.1**: Code should follow language-specific best practices
- **NFR-4.2**: All components should have comprehensive logging
- **NFR-4.3**: System should expose health check endpoints
- **NFR-4.4**: Configuration should be externalized via environment variables

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Next.js Application (Vercel)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Frontend (React/TypeScript)             │  │
│  │  - Dashboard, Program List, Change Viewer            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes (/api/*)                      │  │
│  │  - Program CRUD                                       │  │
│  │  - IDL & Change retrieval                            │  │
│  │  - Settings management                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Cron Job (/api/cron/monitor-idls)           │  │
│  │  Runs every 6 hours (configured in vercel.json)     │  │
│  │  1. Fetch active programs from Supabase              │  │
│  │  2. For each program:                                │  │
│  │     a. Connect to Solana RPC (Mainnet)              │  │
│  │     b. Derive IDL account address                   │  │
│  │     c. Fetch IDL from on-chain account              │  │
│  │     d. Calculate IDL hash                           │  │
│  │     e. Compare with latest snapshot                 │  │
│  │     f. If changed: detect & categorize changes      │  │
│  │     g. Store new snapshot & change records          │  │
│  │     h. Trigger notification                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Shared Utility Functions                │  │
│  │  - IDL fetching logic                                │  │
│  │  - Change detection algorithms                       │  │
│  │  - Notification helpers                              │  │
│  │  - Database operations                               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ Supabase Client
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Supabase Platform                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                PostgreSQL Database                    │  │
│  │  - monitored_programs                                │  │
│  │  - idl_snapshots                                     │  │
│  │  - idl_changes                                       │  │
│  │  - notification_settings                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Row Level Security                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Solana Mainnet │ │  Supabase   │ │  Telegram Bot   │
│   RPC Endpoint  │ │  Database   │ │      API        │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

### Technology Stack

#### Unified Next.js Application
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form
- **UI Components**: shadcn/ui or Radix UI
- **Diff Viewer**: react-diff-viewer or monaco-diff-editor

#### Solana Integration
- **SDK**: @solana/web3.js
- **Anchor**: @coral-xyz/anchor (for IDL parsing)
- **Utilities**: 
  - bs58 (base58 encoding)
  - buffer (for browser compatibility)
  - crypto (for hashing)

#### Database & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (optional, phase 2)
- **Hosting**: Vercel
  - Serverless Functions for API routes
  - Edge Functions (optional, for low-latency)
  - Cron Jobs for scheduled monitoring
- **Monitoring**: Sentry (error tracking), Vercel Analytics

#### External APIs
- **Solana RPC**: 
  - Primary: Helius, QuickNode, or Triton
  - Fallback: Public RPC (rate-limited)
- **Telegram Bot API**: https://api.telegram.org/bot{token}/sendMessage

#### Key NPM Packages
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.87.0",
    "@coral-xyz/anchor": "^0.29.0",
    "@supabase/supabase-js": "^2.38.0",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-query": "^5.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "bs58": "^5.0.0",
    "pako": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## Database Design

### Schema Definition

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Programs being monitored
CREATE TABLE monitored_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active program queries
CREATE INDEX idx_monitored_programs_active 
ON monitored_programs(is_active) 
WHERE is_active = true;

-- IDL snapshots (historical versions)
CREATE TABLE idl_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    idl_hash TEXT NOT NULL,
    idl_content JSONB NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_program_hash UNIQUE(program_id, idl_hash)
);

-- Index for fetching latest snapshot
CREATE INDEX idx_idl_snapshots_program_fetched 
ON idl_snapshots(program_id, fetched_at DESC);

-- Index for hash lookup
CREATE INDEX idx_idl_snapshots_hash 
ON idl_snapshots(idl_hash);

-- Detected changes
CREATE TABLE idl_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES monitored_programs(id) ON DELETE CASCADE,
    old_snapshot_id UUID REFERENCES idl_snapshots(id) ON DELETE SET NULL,
    new_snapshot_id UUID NOT NULL REFERENCES idl_snapshots(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    change_details JSONB NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent changes query
CREATE INDEX idx_idl_changes_detected 
ON idl_changes(detected_at DESC);

-- Index for program-specific changes
CREATE INDEX idx_idl_changes_program 
ON idl_changes(program_id, detected_at DESC);

-- Index for unnotified changes
CREATE INDEX idx_idl_changes_unnotified 
ON idl_changes(notified) 
WHERE notified = false;

-- Telegram notification settings
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO notification_settings (setting_key, setting_value, is_active) 
VALUES 
    ('telegram_bot_token', '', false),
    ('telegram_chat_id', '', false),
    ('check_interval_hours', '6', true);

-- Monitoring logs for debugging
CREATE TABLE monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL,
    program_id UUID REFERENCES monitored_programs(id) ON DELETE SET NULL,
    log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX idx_monitoring_logs_run 
ON monitoring_logs(run_id, created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monitored_programs_updated_at 
    BEFORE UPDATE ON monitored_programs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Data Models

#### TypeScript Types

```typescript
// lib/types.ts

export interface MonitoredProgram {
  id: string;
  program_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IdlSnapshot {
  id: string;
  program_id: string;
  idl_hash: string;
  idl_content: any; // Anchor IDL JSON
  version_number: number;
  fetched_at: string;
}

export type ChangeSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ChangeType = 
  | 'instruction_added'
  | 'instruction_removed'
  | 'instruction_modified'
  | 'account_modified'
  | 'type_added'
  | 'type_modified'
  | 'type_removed';

export interface IdlChange {
  id: string;
  program_id: string;
  old_snapshot_id?: string;
  new_snapshot_id: string;
  change_type: ChangeType;
  change_summary: string;
  change_details: {
    instruction_name?: string;
    field_name?: string;
    old_value?: any;
    new_value?: any;
    diff?: any;
  };
  severity: ChangeSeverity;
  notified: boolean;
  notified_at?: string;
  detected_at: string;
}

export interface NotificationSettings {
  telegram_bot_token: string;
  telegram_chat_id: string;
  check_interval_hours: number;
}

export interface MonitoringResult {
  programsChecked: number;
  programsWithChanges: number;
  totalChanges: number;
  errors: Array<{ programId: string; error: string }>;
}
```

---

## Next.js Application Design

### Project Structure

```
solana-idl-monitor-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── programs/
│   │   ├── page.tsx                # Program list
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Program detail
│   │   │   └── changes/
│   │   │       └── [changeId]/
│   │   │           └── page.tsx    # Change detail with diff
│   ├── settings/
│   │   └── page.tsx                # Settings page
│   └── api/
│       ├── programs/
│       │   ├── route.ts            # GET, POST /api/programs
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE /api/programs/[id]
│       │       ├── idls/
│       │       │   └── route.ts    # GET /api/programs/[id]/idls
│       │       └── changes/
│       │           └── route.ts    # GET /api/programs/[id]/changes
│       ├── changes/
│       │   ├── route.ts            # GET /api/changes
│       │   └── [id]/
│       │       └── route.ts        # GET /api/changes/[id]
│       └── settings/
│           ├── telegram/
│           │   └── route.ts        # GET, POST /api/settings/telegram
│           └── check-interval/
│               └── route.ts        # GET, PUT /api/settings/check-interval
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ProgramCard.tsx
│   ├── ChangeCard.tsx
│   ├── IdlDiffViewer.tsx
│   ├── SeverityBadge.tsx
│   └── ProgramForm.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── package.json
```

### API Route Examples

#### GET /api/programs

```typescript
// app/api/programs/route.ts

import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('monitored_programs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ programs: data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  
  const { program_id, name, description } = body;
  
  // Validate Solana address
  if (!program_id || program_id.length !== 44) {
    return NextResponse.json(
      { error: 'Invalid Solana program address' },
      { status: 400 }
    );
  }
  
  const { data, error } = await supabase
    .from('monitored_programs')
    .insert({ program_id, name, description })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Program already being monitored' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ program: data }, { status: 201 });
}
```

#### GET /api/changes

```typescript
// app/api/changes/route.ts

import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;
  
  const programId = searchParams.get('program_id');
  const severity = searchParams.get('severity');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  let query = supabase
    .from('idl_changes')
    .select(`
      *,
      program:monitored_programs(id, name, program_id),
      old_snapshot:idl_snapshots!old_snapshot_id(idl_content),
      new_snapshot:idl_snapshots!new_snapshot_id(idl_content)
    `)
    .order('detected_at', { ascending: false })
    .limit(limit);
  
  if (programId) {
    query = query.eq('program_id', programId);
  }
  
  if (severity) {
    query = query.eq('severity', severity);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ changes: data });
}
```

### Key UI Components

#### Dashboard Page

```typescript
// app/page.tsx

import { ProgramCard } from '@/components/ProgramCard';
import { ChangeCard } from '@/components/ChangeCard';
import { createClient } from '@/lib/supabase';

export default async function Dashboard() {
  const supabase = createClient();
  
  const [programsResult, changesResult] = await Promise.all([
    supabase
      .from('monitored_programs')
      .select('*')
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('idl_changes')
      .select(`
        *,
        program:monitored_programs(name, program_id)
      `)
      .order('detected_at', { ascending: false })
      .limit(20)
  ]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Solana IDL Monitor</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Monitored Programs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programsResult.data?.map(program => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Changes</h2>
        <div className="space-y-4">
          {changesResult.data?.map(change => (
            <ChangeCard key={change.id} change={change} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

#### IDL Diff Viewer Component

```typescript
// components/IdlDiffViewer.tsx

'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ReactDiffViewer = dynamic(() => import('react-diff-viewer'), {
  ssr: false,
});

interface IdlDiffViewerProps {
  oldIdl: any;
  newIdl: any;
}

export function IdlDiffViewer({ oldIdl, newIdl }: IdlDiffViewerProps) {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  
  useEffect(() => {
    setOldText(JSON.stringify(oldIdl, null, 2));
    setNewText(JSON.stringify(newIdl, null, 2));
  }, [oldIdl, newIdl]);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <ReactDiffViewer
        oldValue={oldText}
        newValue={newText}
        splitView={true}
        useDarkTheme={false}
        leftTitle="Previous Version"
        rightTitle="Current Version"
      />
    </div>
  );
}
```

---

## IDL Monitor Service (TypeScript/Vercel Cron)

### Project Structure

```
solana-idl-monitor/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── programs/
│   │   ├── page.tsx                # Program list
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Program detail
│   │   │   └── changes/
│   │   │       └── [changeId]/
│   │   │           └── page.tsx    # Change detail with diff
│   ├── settings/
│   │   └── page.tsx                # Settings page
│   └── api/
│       ├── programs/
│       │   ├── route.ts            # GET, POST /api/programs
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE /api/programs/[id]
│       │       ├── idls/
│       │       │   └── route.ts    # GET /api/programs/[id]/idls
│       │       └── changes/
│       │           └── route.ts    # GET /api/programs/[id]/changes
│       ├── changes/
│       │   ├── route.ts            # GET /api/changes
│       │   └── [id]/
│       │       └── route.ts        # GET /api/changes/[id]
│       ├── settings/
│       │   ├── telegram/
│       │   │   └── route.ts        # GET, POST /api/settings/telegram
│       │   └── check-interval/
│       │       └── route.ts        # GET, PUT /api/settings/check-interval
│       └── cron/
│           └── monitor-idls/
│               └── route.ts        # Vercel Cron Job endpoint
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ProgramCard.tsx
│   ├── ChangeCard.tsx
│   ├── IdlDiffViewer.tsx
│   ├── SeverityBadge.tsx
│   └── ProgramForm.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── types.ts                    # TypeScript types
│   ├── utils.ts                    # Utility functions
│   ├── solana/
│   │   ├── idl-fetcher.ts          # IDL fetching from Solana
│   │   ├── idl-parser.ts           # IDL parsing utilities
│   │   └── connection.ts           # Solana connection config
│   ├── monitoring/
│   │   ├── change-detector.ts      # Change detection logic
│   │   ├── severity-calculator.ts  # Severity determination
│   │   └── monitor.ts              # Main monitoring orchestration
│   ├── notifications/
│   │   └── telegram.ts             # Telegram notification service
│   └── db/
│       ├── programs.ts             # Program database operations
│       ├── snapshots.ts            # Snapshot database operations
│       ├── changes.ts              # Changes database operations
│       └── settings.ts             # Settings database operations
├── vercel.json                     # Vercel config with cron schedule
├── package.json
└── tsconfig.json
```

### Vercel Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/monitor-idls",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Package Configuration

```json
// package.json
{
  "name": "solana-idl-monitor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@solana/web3.js": "^1.87.6",
    "@coral-xyz/anchor": "^0.29.0",
    "@supabase/supabase-js": "^2.38.4",
    "@tanstack/react-query": "^5.8.4",
    "next": "14.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-diff-viewer": "^3.1.1",
    "zod": "^3.22.4",
    "bs58": "^5.0.0",
    "pako": "^2.1.0",
    "tailwindcss": "^3.3.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "typescript": "^5.3.2",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.3"
  }
}
```

### Core Implementation

#### Vercel Cron Endpoint

```typescript
// app/api/cron/monitor-idls/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { monitorAllPrograms } from '@/lib/monitoring/monitor';

export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting IDL monitoring run...');
    const result = await monitorAllPrograms();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in monitoring run:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
```

#### Main Monitor Orchestration

```typescript
// lib/monitoring/monitor.ts

import { createClient } from '@/lib/supabase';
import { fetchIdlFromChain } from '@/lib/solana/idl-fetcher';
import { detectChanges } from '@/lib/monitoring/change-detector';
import { sendTelegramNotification } from '@/lib/notifications/telegram';
import { 
  getActivePrograms,
  getLatestSnapshot,
  createSnapshot,
  snapshotExists,
  createChanges,
  markChangesAsNotified
} from '@/lib/db';
import { calculateIdlHash } from '@/lib/utils';

export interface MonitoringResult {
  programsChecked: number;
  programsWithChanges: number;
  totalChanges: number;
  errors: Array<{ programId: string; error: string }>;
}

export async function monitorAllPrograms(): Promise<MonitoringResult> {
  const supabase = createClient();
  const result: MonitoringResult = {
    programsChecked: 0,
    programsWithChanges: 0,
    totalChanges: 0,
    errors: []
  };

  try {
    // Fetch all active programs
    const programs = await getActivePrograms(supabase);
    console.log(`Found ${programs.length} active programs to monitor`);

    // Process each program
    for (const program of programs) {
      try {
        console.log(`Processing program: ${program.name} (${program.program_id})`);
        
        const changes = await monitorProgram(supabase, program);
        
        result.programsChecked++;
        if (changes > 0) {
          result.programsWithChanges++;
          result.totalChanges += changes;
        }
      } catch (error) {
        console.error(`Error processing program ${program.name}:`, error);
        result.errors.push({
          programId: program.program_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('Monitoring run complete:', result);
    return result;
  } catch (error) {
    console.error('Error in monitoring run:', error);
    throw error;
  }
}

async function monitorProgram(
  supabase: any,
  program: any
): Promise<number> {
  // 1. Fetch current IDL from chain
  const idl = await fetchIdlFromChain(program.program_id);
  
  // 2. Calculate hash
  const idlHash = calculateIdlHash(idl);
  
  // 3. Check if this IDL version already exists
  const exists = await snapshotExists(supabase, program.id, idlHash);
  if (exists) {
    console.log(`No changes detected for program: ${program.name}`);
    return 0;
  }
  
  // 4. Fetch the latest snapshot for comparison
  const latestSnapshot = await getLatestSnapshot(supabase, program.id);
  
  // 5. Create new snapshot
  const newSnapshot = await createSnapshot(supabase, {
    program_id: program.id,
    idl_hash: idlHash,
    idl_content: idl
  });
  
  // 6. If there's a previous snapshot, detect changes
  if (latestSnapshot) {
    console.log(`Detecting changes for program: ${program.name}`);
    
    const changes = detectChanges(latestSnapshot.idl_content, idl);
    
    if (changes.length > 0) {
      console.log(`Detected ${changes.length} changes`);
      
      // 7. Store changes in database
      await createChanges(supabase, {
        program_id: program.id,
        old_snapshot_id: latestSnapshot.id,
        new_snapshot_id: newSnapshot.id,
        changes
      });
      
      // 8. Send notifications
      const notificationsSent = await sendNotificationsForChanges(
        supabase,
        program,
        changes
      );
      
      if (notificationsSent) {
        await markChangesAsNotified(supabase, program.id, newSnapshot.id);
      }
      
      return changes.length;
    }
  } else {
    console.log(`First snapshot for program: ${program.name}`);
  }
  
  return 0;
}

async function sendNotificationsForChanges(
  supabase: any,
  program: any,
  changes: any[]
): Promise<boolean> {
  try {
    // Get notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('is_active', true);
    
    if (!settings || settings.length === 0) {
      console.log('No active notification settings found');
      return false;
    }
    
    const telegramSettings = settings.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});
    
    if (!telegramSettings.telegram_bot_token || !telegramSettings.telegram_chat_id) {
      console.log('Telegram not configured');
      return false;
    }
    
    await sendTelegramNotification(
      telegramSettings.telegram_bot_token,
      telegramSettings.telegram_chat_id,
      program,
      changes
    );
    
    return true;
  } catch (error) {
    console.error('Error sending notifications:', error);
    return false;
  }
}
```

#### IDL Fetcher

```typescript
// lib/solana/idl-fetcher.ts

import { Connection, PublicKey } from '@solana/web3.js';
import { inflate } from 'pako';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Fetch IDL from on-chain account
 * 
 * Anchor programs store their IDL in a PDA derived from:
 * seeds = [b"anchor:idl", program_id]
 * program_id = program_id
 */
export async function fetchIdlFromChain(programId: string): Promise<any> {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Parse program ID
  const programPubkey = new PublicKey(programId);
  
  // Derive IDL account address
  const idlAddress = await deriveIdlAddress(programPubkey);
  
  console.log(`Fetching IDL from account: ${idlAddress.toBase58()}`);
  
  // Fetch account data with retries
  const accountData = await fetchAccountWithRetry(connection, idlAddress);
  
  // Parse IDL from account data
  return parseIdlFromAccountData(accountData);
}

/**
 * Derive the IDL account address for a program
 */
async function deriveIdlAddress(programId: PublicKey): Promise<PublicKey> {
  const [idlAddress] = await PublicKey.findProgramAddress(
    [Buffer.from('anchor:idl'), programId.toBuffer()],
    programId
  );
  
  return idlAddress;
}

/**
 * Fetch account data with retry logic
 */
async function fetchAccountWithRetry(
  connection: Connection,
  address: PublicKey,
  retries = 0
): Promise<Buffer> {
  try {
    const accountInfo = await connection.getAccountInfo(address);
    
    if (!accountInfo) {
      throw new Error('IDL account not found');
    }
    
    return Buffer.from(accountInfo.data);
  } catch (error) {
    if (retries >= MAX_RETRIES) {
      throw new Error(
        `Failed to fetch account after ${MAX_RETRIES} retries: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
    
    console.log(`Retry ${retries + 1}/${MAX_RETRIES} after error:`, error);
    await sleep(RETRY_DELAY);
    return fetchAccountWithRetry(connection, address, retries + 1);
  }
}

/**
 * Parse IDL from account data
 * 
 * Anchor IDL account structure:
 * [8 bytes discriminator] + [4 bytes authority] + [compressed IDL data]
 */
function parseIdlFromAccountData(data: Buffer): any {
  if (data.length < 12) {
    throw new Error('Account data too short to contain IDL');
  }
  
  // Skip discriminator (8 bytes) and authority (4 bytes)
  const compressedData = data.slice(12);
  
  // Decompress the IDL data (Anchor uses zlib/deflate compression)
  let decompressed: Uint8Array;
  try {
    decompressed = inflate(compressedData);
  } catch (error) {
    throw new Error(
      `Failed to decompress IDL data: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
  
  // Parse JSON
  try {
    const idl = JSON.parse(Buffer.from(decompressed).toString('utf-8'));
    return idl;
  } catch (error) {
    throw new Error(
      `Failed to parse IDL JSON: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connection configuration helper
 */
export function createSolanaConnection(customRpcUrl?: string): Connection {
  return new Connection(
    customRpcUrl || RPC_URL,
    {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    }
  );
}
```

#### Change Detector

```typescript
// lib/monitoring/change-detector.ts

import { ChangeSeverity, ChangeType } from '@/lib/types';

export interface DetectedChange {
  change_type: ChangeType;
  change_summary: string;
  instruction_name?: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  severity: ChangeSeverity;
}

export function detectChanges(oldIdl: any, newIdl: any): DetectedChange[] {
  const changes: DetectedChange[] = [];
  
  // Extract instructions from both IDLs
  const oldInstructions = extractInstructions(oldIdl);
  const newInstructions = extractInstructions(newIdl);
  
  // Detect instruction changes
  changes.push(...detectInstructionChanges(oldInstructions, newInstructions));
  
  // Detect type changes
  const oldTypes = extractTypes(oldIdl);
  const newTypes = extractTypes(newIdl);
  changes.push(...detectTypeChanges(oldTypes, newTypes));
  
  return changes;
}

function extractInstructions(idl: any): any[] {
  return idl?.instructions || [];
}

function extractTypes(idl: any): any[] {
  return idl?.types || [];
}

function detectInstructionChanges(
  oldInstructions: any[],
  newInstructions: any[]
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  
  const oldMap = new Map(
    oldInstructions.map(instr => [instr.name, instr])
  );
  const newMap = new Map(
    newInstructions.map(instr => [instr.name, instr])
  );
  
  // Detect removed instructions
  for (const [name, _] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        change_type: 'instruction_removed',
        change_summary: `Instruction '${name}' was removed`,
        instruction_name: name,
        severity: 'critical'
      });
    }
  }
  
  // Detect added instructions
  for (const [name, instr] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        change_type: 'instruction_added',
        change_summary: `New instruction '${name}' was added`,
        instruction_name: name,
        new_value: instr,
        severity: 'medium'
      });
    }
  }
  
  // Detect modified instructions
  for (const [name, oldInstr] of oldMap) {
    const newInstr = newMap.get(name);
    if (newInstr) {
      // Compare args
      const oldArgs = oldInstr.args || [];
      const newArgs = newInstr.args || [];
      
      if (JSON.stringify(oldArgs) !== JSON.stringify(newArgs)) {
        const severity = determineArgsChangeSeverity(oldArgs, newArgs);
        changes.push({
          change_type: 'instruction_modified',
          change_summary: `Instruction '${name}' arguments changed`,
          instruction_name: name,
          field_name: 'args',
          old_value: oldArgs,
          new_value: newArgs,
          severity
        });
      }
      
      // Compare accounts
      const oldAccounts = oldInstr.accounts || [];
      const newAccounts = newInstr.accounts || [];
      
      if (JSON.stringify(oldAccounts) !== JSON.stringify(newAccounts)) {
        const severity = determineAccountsChangeSeverity(oldAccounts, newAccounts);
        changes.push({
          change_type: 'account_modified',
          change_summary: `Instruction '${name}' accounts changed`,
          instruction_name: name,
          field_name: 'accounts',
          old_value: oldAccounts,
          new_value: newAccounts,
          severity
        });
      }
    }
  }
  
  return changes;
}

function determineArgsChangeSeverity(
  oldArgs: any[],
  newArgs: any[]
): ChangeSeverity {
  // If args count decreased, definitely breaking
  if (oldArgs.length > newArgs.length) {
    return 'critical';
  }
  
  // If args count increased, might be breaking (depends on if new args are optional)
  if (oldArgs.length < newArgs.length) {
    return 'high';
  }
  
  // Same length, check if order or types changed
  for (let i = 0; i < oldArgs.length; i++) {
    if (oldArgs[i].name !== newArgs[i].name || 
        JSON.stringify(oldArgs[i].type) !== JSON.stringify(newArgs[i].type)) {
      return 'high';
    }
  }
  
  return 'low';
}

function determineAccountsChangeSeverity(
  oldAccounts: any[],
  newAccounts: any[]
): ChangeSeverity {
  // Account count changes are critical
  if (oldAccounts.length !== newAccounts.length) {
    return 'critical';
  }
  
  // Check if names and order match
  const oldNames = oldAccounts.map(a => a.name);
  const newNames = newAccounts.map(a => a.name);
  
  if (JSON.stringify(oldNames) !== JSON.stringify(newNames)) {
    return 'critical';
  }
  
  // Check for constraint changes
  for (let i = 0; i < oldAccounts.length; i++) {
    const oldConstraints = JSON.stringify(oldAccounts[i].constraints || {});
    const newConstraints = JSON.stringify(newAccounts[i].constraints || {});
    
    if (oldConstraints !== newConstraints) {
      return 'high';
    }
    
    // Check mutability changes
    if (oldAccounts[i].isMut !== newAccounts[i].isMut) {
      return 'high';
    }
  }
  
  return 'medium';
}

function detectTypeChanges(
  oldTypes: any[],
  newTypes: any[]
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  
  const oldMap = new Map(
    oldTypes.map(type => [type.name, type])
  );
  const newMap = new Map(
    newTypes.map(type => [type.name, type])
  );
  
  // Detect removed types
  for (const [name, _] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        change_type: 'type_removed',
        change_summary: `Type '${name}' was removed`,
        field_name: name,
        severity: 'high'
      });
    }
  }
  
  // Detect added types
  for (const [name, typeDef] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        change_type: 'type_added',
        change_summary: `New type '${name}' was added`,
        field_name: name,
        new_value: typeDef,
        severity: 'low'
      });
    }
  }
  
  // Detect modified types
  for (const [name, oldType] of oldMap) {
    const newType = newMap.get(name);
    if (newType && JSON.stringify(oldType) !== JSON.stringify(newType)) {
      changes.push({
        change_type: 'type_modified',
        change_summary: `Type '${name}' was modified`,
        field_name: name,
        old_value: oldType,
        new_value: newType,
        severity: 'medium'
      });
    }
  }
  
  return changes;
}
```

#### Notification Service

```typescript
// lib/notifications/telegram.ts

import { DetectedChange } from '@/lib/monitoring/change-detector';

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  program: any,
  changes: DetectedChange[]
): Promise<void> {
  const message = formatNotificationMessage(program, changes);
  
  await sendTelegramMessage(botToken, chatId, message);
  
  console.log(`Notification sent for program: ${program.name}`);
}

function formatNotificationMessage(
  program: any,
  changes: DetectedChange[]
): string {
  let message = '🚨 *IDL Change Detected* 🚨\n\n';
  message += `*Program:* ${escapeMarkdown(program.name)}\n`;
  message += `\`${program.program_id}\`\n\n`;
  
  message += `*${changes.length} change(s) detected:*\n\n`;
  
  changes.forEach((change, i) => {
    const severityEmoji = getSeverityEmoji(change.severity);
    const severityText = change.severity.toUpperCase();
    
    message += `${i + 1}\\. ${severityEmoji} *${severityText}*\n`;
    message += `   ${escapeMarkdown(change.change_summary)}\n`;
    
    if (change.instruction_name) {
      message += `   Instruction: \`${change.instruction_name}\`\n`;
    }
    
    message += '\n';
  });
  
  message += '\n📊 View detailed diff in the dashboard';
  
  return message;
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

function escapeMarkdown(text: string): string {
  // Escape special Markdown characters for Telegram
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2'
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }
}
```

### Environment Variables

```bash
# .env.local

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Solana RPC Configuration
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
# Alternative RPC providers:
# SOLANA_RPC_URL=https://rpc.quicknode.pro/YOUR_KEY
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com (free but rate-limited)

# Cron Job Security
CRON_SECRET=your_random_secret_string_here

# Optional: Node Environment
NODE_ENV=development
```

**Setting up Environment Variables:**

1. **Local Development:**
   - Copy `.env.example` to `.env.local`
   - Fill in your credentials
   - Never commit `.env.local` to git

2. **Vercel Deployment:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add SOLANA_RPC_URL production
   vercel env add CRON_SECRET production
   ```

3. **Generate CRON_SECRET:**
   ```bash
   # Generate a random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

#### Database Operations

```typescript
// lib/db/programs.ts

import { SupabaseClient } from '@supabase/supabase-js';

export async function getActivePrograms(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('monitored_programs')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  return data || [];
}

// lib/db/snapshots.ts

export async function getLatestSnapshot(
  supabase: SupabaseClient,
  programId: string
) {
  const { data, error } = await supabase
    .from('idl_snapshots')
    .select('*')
    .eq('program_id', programId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw error;
  }
  
  return data;
}

export async function snapshotExists(
  supabase: SupabaseClient,
  programId: string,
  idlHash: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('idl_snapshots')
    .select('id')
    .eq('program_id', programId)
    .eq('idl_hash', idlHash)
    .limit(1);
  
  if (error) throw error;
  return (data?.length || 0) > 0;
}

export async function createSnapshot(
  supabase: SupabaseClient,
  snapshot: {
    program_id: string;
    idl_hash: string;
    idl_content: any;
  }
) {
  // Get the next version number
  const { data: latest } = await supabase
    .from('idl_snapshots')
    .select('version_number')
    .eq('program_id', snapshot.program_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
  
  const version_number = (latest?.version_number || 0) + 1;
  
  const { data, error } = await supabase
    .from('idl_snapshots')
    .insert({
      ...snapshot,
      version_number
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// lib/db/changes.ts

export async function createChanges(
  supabase: SupabaseClient,
  params: {
    program_id: string;
    old_snapshot_id: string;
    new_snapshot_id: string;
    changes: any[];
  }
) {
  const records = params.changes.map(change => ({
    program_id: params.program_id,
    old_snapshot_id: params.old_snapshot_id,
    new_snapshot_id: params.new_snapshot_id,
    change_type: change.change_type,
    change_summary: change.change_summary,
    change_details: {
      instruction_name: change.instruction_name,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value
    },
    severity: change.severity
  }));
  
  const { error } = await supabase
    .from('idl_changes')
    .insert(records);
  
  if (error) throw error;
}

export async function markChangesAsNotified(
  supabase: SupabaseClient,
  programId: string,
  snapshotId: string
) {
  const { error } = await supabase
    .from('idl_changes')
    .update({
      notified: true,
      notified_at: new Date().toISOString()
    })
    .eq('program_id', programId)
    .eq('new_snapshot_id', snapshotId);
  
  if (error) throw error;
}
```

#### Utility Functions

```typescript
// lib/utils.ts

import { createHash } from 'crypto';

export function calculateIdlHash(idl: any): string {
  const idlString = JSON.stringify(idl, Object.keys(idl).sort());
  return createHash('sha256').update(idlString).digest('hex');
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
```

---

## Notification System

### Telegram Bot Setup

1. **Create a Telegram Bot:**
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` and follow instructions
   - Save the bot token

2. **Get Chat ID:**
   - Start a chat with your bot
   - Send any message
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

3. **Configure in Supabase:**
   ```sql
   UPDATE notification_settings 
   SET setting_value = 'YOUR_BOT_TOKEN', is_active = true 
   WHERE setting_key = 'telegram_bot_token';
   
   UPDATE notification_settings 
   SET setting_value = 'YOUR_CHAT_ID', is_active = true 
   WHERE setting_key = 'telegram_chat_id';
   ```

### Notification Message Format

```
🚨 *IDL Change Detected* 🚨

*Program:* Jupiter Aggregator
`JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB`

*3 change(s) detected:*

1. 🔴 *CRITICAL*
   Instruction 'swap' was removed
   
2. 🟠 *HIGH*
   Instruction 'route' arguments changed
   Instruction: `route`
   
3. 🟡 *MEDIUM*
   New instruction 'swapV2' was added

📊 View detailed diff in the dashboard
```

---

## Security Considerations

### Database Security

1. **Supabase Row Level Security (RLS):**
   - Enable RLS on all tables
   - Create policies for authenticated access only (if using auth)
   - Example policy:
   ```sql
   ALTER TABLE monitored_programs ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Enable read access for all users" 
   ON monitored_programs FOR SELECT 
   USING (true);
   
   CREATE POLICY "Enable write access for authenticated users only" 
   ON monitored_programs FOR ALL 
   USING (auth.role() = 'authenticated');
   ```

2. **Encrypted Secrets:**
   - Store Telegram bot token encrypted in production
   - Use Supabase Vault for sensitive data
   - Rotate tokens regularly

3. **Database Credentials:**
   - Use environment variables for database URLs
   - Never commit credentials to git
   - Use `.env.local` for local development

### API Security

1. **Rate Limiting:**
   - Implement rate limiting on API routes
   - Use middleware to prevent abuse
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     // Add rate limiting logic
   }
   ```

2. **Input Validation:**
   - Validate all program addresses
   - Sanitize user inputs
   - Use TypeScript types for type safety

3. **CORS Configuration:**
   - Restrict API access to known origins
   - Configure appropriate CORS headers

### Rust Service Security

1. **RPC Endpoint Security:**
   - Use authenticated RPC endpoints
   - Implement retry logic with exponential backoff
   - Monitor for rate limits

2. **Error Handling:**
   - Don't expose sensitive information in error messages
   - Log errors securely
   - Implement proper error recovery

3. **Dependencies:**
   - Regularly update dependencies
   - Use `cargo audit` to check for vulnerabilities
   - Pin dependency versions in production

---

## Deployment Strategy

## Deployment Strategy

### Unified Vercel Deployment

The entire application (frontend, API, and monitoring service) is deployed as a single Next.js application on Vercel.

#### 1. Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Initialize project
vercel init
```

#### 2. Environment Variables

Configure in Vercel dashboard or via CLI:

```bash
# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Solana
vercel env add SOLANA_RPC_URL

# Cron Secret (for securing cron endpoints)
vercel env add CRON_SECRET
```

Create `.env.local` for local development:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
CRON_SECRET=your_random_secret
```

#### 3. Vercel Cron Configuration

Create or update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/monitor-idls",
      "schedule": "0 */6 * * *"
    }
  ],
  "env": {
    "SOLANA_RPC_URL": "@solana_rpc_url",
    "CRON_SECRET": "@cron_secret"
  }
}
```

**Cron Schedule Syntax:**
- `0 */6 * * *` - Every 6 hours
- `0 */12 * * *` - Every 12 hours
- `0 0 * * *` - Daily at midnight
- `0 * * * *` - Every hour

**Important:** Vercel Cron jobs are only available on Pro and Enterprise plans. For the Hobby plan, consider using an external cron service like:
- GitHub Actions (scheduled workflows)
- Cron-job.org
- EasyCron

#### 4. Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or push to main branch (with Git integration)
git push origin main
```

#### 5. Verify Cron Job

After deployment:
1. Go to Vercel Dashboard → Your Project → Cron
2. You should see your scheduled job listed
3. Monitor execution logs in the Logs tab

#### 6. Test Cron Endpoint Manually

```bash
# Test the cron endpoint (replace with your actual URL and secret)
curl -X GET https://your-app.vercel.app/api/cron/monitor-idls \
  -H "Authorization: Bearer your_cron_secret"
```

### Alternative: GitHub Actions Cron

If not using Vercel Pro, use GitHub Actions as a scheduler:

```yaml
# .github/workflows/monitor-idls.yml
name: Monitor IDLs

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Monitoring
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/monitor-idls \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add secrets in GitHub repository settings:
- `APP_URL`: Your Vercel app URL
- `CRON_SECRET`: Same secret from your environment variables

### Supabase Setup

1. **Create Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the project URL and anon key

2. **Run Migrations:**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link project
   supabase link --project-ref <your-project-ref>
   
   # Run migrations
   supabase db push
   ```

3. **Backup Configuration:**
   - Enable automatic backups in Supabase dashboard
   - Schedule daily backups
   - Test restore procedure

---

## Development Roadmap

### Phase 1: MVP (Weeks 1-2)

**Database & Infrastructure**
- [x] Database schema design
- [ ] Set up Supabase project
- [ ] Create and run database migrations
- [ ] Configure Row Level Security policies

**Core Monitoring Logic**
- [ ] Implement IDL fetching from on-chain accounts
  - Solana connection setup
  - PDA derivation for IDL accounts
  - Data decompression and parsing
- [ ] Implement change detection algorithm
  - Instruction comparison
  - Type comparison
  - Severity calculation
- [ ] Create database operation utilities
  - Program CRUD
  - Snapshot management
  - Change tracking

**Vercel Cron Job**
- [ ] Implement `/api/cron/monitor-idls` endpoint
- [ ] Add cron job security (bearer token)
- [ ] Implement main monitoring orchestration
- [ ] Configure `vercel.json` with cron schedule

**Basic API Routes**
- [ ] Program management endpoints
  - POST /api/programs (add program)
  - GET /api/programs (list programs)
  - DELETE /api/programs/[id] (remove program)
- [ ] Settings endpoints
  - GET/POST /api/settings/telegram

**Basic UI**
- [ ] Next.js project setup with TypeScript
- [ ] Dashboard page (program list)
- [ ] Add program form
- [ ] Basic Telegram notification integration

**Deployment**
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Test cron job execution

### Phase 2: Enhanced Features (Weeks 3-4)

**Advanced Change Detection**
- [ ] Detailed diff generation
- [ ] Account constraint comparison
- [ ] Breaking vs non-breaking change classification
- [ ] Change impact analysis

**Improved UI**
- [ ] IDL diff viewer component
  - Side-by-side JSON diff
  - Syntax highlighting
  - Collapsible sections
- [ ] Change history timeline
- [ ] Program detail page with full history
- [ ] Change detail page with expanded diff

**Filtering & Search**
- [ ] Filter changes by severity
- [ ] Filter changes by type
- [ ] Search programs by name/address
- [ ] Date range filtering

**Settings Management**
- [ ] UI for configuring check interval
- [ ] Notification preferences
- [ ] Test notification button
- [ ] Program activation/deactivation

**Error Handling & Logging**
- [ ] Comprehensive error handling in cron job
- [ ] Retry logic for RPC failures
- [ ] Monitoring logs table
- [ ] Admin dashboard for logs

**Testing**
- [ ] Unit tests for change detection
- [ ] Integration tests for API routes
- [ ] End-to-end tests for critical flows

### Phase 3: Advanced Features (Weeks 5-6)

**Authentication & Multi-User**
- [ ] Implement Supabase Auth
- [ ] User registration/login
- [ ] User-specific program lists
- [ ] Team collaboration features

**Enhanced Notifications**
- [ ] Email notifications (via Resend/SendGrid)
- [ ] Discord webhook support
- [ ] Slack integration
- [ ] Webhook endpoints for custom integrations

**Custom Alert Rules**
- [ ] Configurable notification thresholds
- [ ] Per-program notification settings
- [ ] Quiet hours configuration
- [ ] Notification grouping/batching

**Analytics & Insights**
- [ ] Change frequency trends
- [ ] Most active programs
- [ ] Severity distribution charts
- [ ] Historical analysis tools

**API for Integrations**
- [ ] REST API documentation
- [ ] API key management
- [ ] Rate limiting
- [ ] Webhook delivery system

**Developer Tools**
- [ ] CLI tool for adding programs
- [ ] SDK for programmatic access
- [ ] Migration guide generator
- [ ] Export/import program lists

### Phase 4: Optimization & Scale (Ongoing)

**Performance Optimization**
- [ ] Database query optimization
- [ ] Implement caching layer (Redis/Upstash)
- [ ] Optimize IDL fetching (batch requests)
- [ ] Add database indexes for common queries

**Scalability**
- [ ] Implement queue system for large program lists
- [ ] Add rate limiting for API
- [ ] Optimize for 1000+ programs
- [ ] Implement CDN for static assets

**Real-time Features**
- [ ] WebSocket support for live updates
- [ ] Real-time dashboard updates
- [ ] Live notification stream

**Advanced UI**
- [ ] Program dependency graph visualization
- [ ] Impact analysis tools
- [ ] Comparison view (compare multiple programs)
- [ ] Export reports to PDF

**Mobile Support**
- [ ] Responsive design improvements
- [ ] PWA support
- [ ] Mobile-optimized views
- [ ] Push notifications (optional)

**Monitoring & Observability**
- [ ] Integration with Sentry
- [ ] Custom metrics and dashboards
- [ ] Uptime monitoring
- [ ] Performance tracking

### Quick Start Checklist

For developers getting started, here's a condensed checklist:

**Day 1: Setup**
- [ ] Create Supabase project
- [ ] Clone/create Next.js project
- [ ] Install dependencies (`npm install`)
- [ ] Configure environment variables
- [ ] Run database migrations

**Day 2-3: Core Logic**
- [ ] Implement IDL fetcher
- [ ] Implement change detector
- [ ] Create database utilities
- [ ] Build cron endpoint

**Day 4-5: Basic UI**
- [ ] Create dashboard page
- [ ] Add program form
- [ ] List recent changes
- [ ] Configure Telegram notifications

**Day 6-7: Testing & Deployment**
- [ ] Test locally
- [ ] Deploy to Vercel
- [ ] Configure cron job
- [ ] Monitor first run

**Week 2: Iteration**
- [ ] Add diff viewer
- [ ] Improve error handling
- [ ] Enhance UI/UX
- [ ] Documentation

---

## Future Enhancements

### Potential Features

1. **Smart Contract Dependency Graph:**
   - Visualize dependencies between programs
   - Identify cascading impacts of changes

2. **AI-Powered Analysis:**
   - Use LLM to explain breaking changes
   - Generate migration guides automatically
   - Suggest code updates for dependent programs

3. **Testing Integration:**
   - Automatically run tests against new IDL versions
   - Integration with CI/CD pipelines
   - Compatibility testing tools

4. **Community Features:**
   - Public registry of monitored programs
   - Shared change notifications
   - Community-contributed migration guides

5. **Advanced Notifications:**
   - Discord bot
   - Slack integration
   - PagerDuty for critical changes
   - Custom webhooks

6. **Version Control Integration:**
   - Automatic PR creation for IDL updates
   - Git diff-style IDL comparison
   - Changelog generation

7. **Market Analysis:**
   - Track adoption of program versions
   - Analyze upgrade patterns
   - Ecosystem health metrics

---

## Appendix

### Useful Resources

- **Solana Documentation:** https://docs.solana.com
- **Anchor Framework:** https://www.anchor-lang.com
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Telegram Bot API:** https://core.telegram.org/bots/api

### Common Issues & Solutions

#### Issue: IDL Account Not Found
**Solution:** Not all programs store their IDL on-chain. Consider adding fallback to fetch from GitHub or build artifacts.

#### Issue: RPC Rate Limiting
**Solution:** 
- Use premium RPC provider (Helius, QuickNode)
- Implement exponential backoff
- Add multiple RPC endpoints with failover

#### Issue: Large IDL Causing Performance Issues
**Solution:**
- Implement pagination for IDL history
- Store only diffs instead of full IDL snapshots
- Add indexing for faster queries

#### Issue: Missed Changes During Downtime
**Solution:**
- Implement heartbeat monitoring
- Add alerting for monitor service failures
- Store "last successful check" timestamp

### Contact & Support

For questions or issues:
- GitHub Issues: [Create an issue]
- Email: [your-email]
- Discord: [your-discord-server]

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Author:** [Your Name]
