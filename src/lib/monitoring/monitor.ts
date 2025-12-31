import {
  createSolanaConnection,
  fetchIdlFromChain,
} from "../solana/idl-fetcher";
import { calculateIdlHash, generateUUID } from "../utils";
import { getActivePrograms } from "../db/programs";
import {
  getLatestSnapshot,
  snapshotExists,
  createSnapshot,
} from "../db/snapshots";
import { createChanges } from "../db/changes";
import { detectChanges } from "./change-detector";
import { supabaseAdmin } from "../supabase";
import { cache, CacheKeys, CacheTTL } from "../cache";

export interface MonitoringResult {
  runId: string;
  programsChecked: number;
  snapshotsCreated: number;
  changesDetected: number;
  errors: Array<{
    programId: string;
    error: string;
  }>;
  duration: number;
}

export interface InitialIdlFetchResult {
  success: boolean;
  snapshotCreated: boolean;
  error?: string;
  idlFound: boolean;
}

/**
 * Immediately fetch IDL for a newly created program
 * This is called when a program is first added to provide immediate validation
 */
export async function fetchInitialIdl(
  program: any
): Promise<InitialIdlFetchResult> {
  const runId = generateUUID();

  try {
    console.log(
      `Fetching initial IDL for program: ${program.name} (${program.program_id})`
    );

    // Create Solana connection
    const connection = createSolanaConnection();

    // Fetch current IDL from chain
    const currentIdl = await fetchIdlFromChain(connection, program.program_id);

    if (!currentIdl) {
      console.log(`No IDL found for program ${program.name}`);
      await logMonitoringEvent(
        runId,
        program.id,
        "warning",
        "No IDL found on chain during initial fetch"
      );
      return {
        success: true,
        snapshotCreated: false,
        idlFound: false,
        error: "No IDL found on chain",
      };
    }

    // Calculate IDL hash
    const idlHash = calculateIdlHash(currentIdl);

    // Create initial snapshot (there shouldn't be any existing snapshots)
    const newSnapshot = await createSnapshot(program.id, idlHash, currentIdl);
    console.log(`Created initial snapshot for program ${program.name}`);

    await logMonitoringEvent(
      runId,
      program.id,
      "info",
      "Initial IDL snapshot created successfully"
    );

    return {
      success: true,
      snapshotCreated: true,
      idlFound: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `Error fetching initial IDL for program ${program.name}:`,
      error
    );

    await logMonitoringEvent(
      runId,
      program.id,
      "error",
      `Failed to fetch initial IDL: ${errorMessage}`
    );

    return {
      success: false,
      snapshotCreated: false,
      idlFound: false,
      error: errorMessage,
    };
  }
}

/**
 * Main monitoring function that checks all active programs for IDL changes
 */
export async function monitorPrograms(): Promise<MonitoringResult> {
  const runId = generateUUID();
  const startTime = Date.now();

  console.log(`Starting IDL monitoring run ${runId}`);

  const result: MonitoringResult = {
    runId,
    programsChecked: 0,
    snapshotsCreated: 0,
    changesDetected: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Log monitoring start
    await logMonitoringEvent(
      runId,
      null,
      "info",
      "Starting IDL monitoring run"
    );

    // Get all active programs
    const programs = await getActivePrograms();
    console.log(`Found ${programs.length} active programs to monitor`);

    if (programs.length === 0) {
      await logMonitoringEvent(
        runId,
        null,
        "info",
        "No active programs to monitor"
      );
      result.duration = Date.now() - startTime;
      return result;
    }

    // Create Solana connection
    const connection = createSolanaConnection();

    // Monitor programs in parallel with concurrency limit to avoid overwhelming RPC
    // Process 10 programs concurrently for optimal performance
    const CONCURRENCY_LIMIT = 10;

    // Helper to process programs in batches
    const processBatch = async (batch: typeof programs) => {
      const batchResults = await Promise.allSettled(
        batch.map(async (program) => {
          console.log(
            `Monitoring program: ${program.name} (${program.program_id})`
          );

          const programResult = await monitorProgram(runId, connection, program);

          await logMonitoringEvent(
            runId,
            program.id,
            "info",
            `Program monitored successfully. Snapshot created: ${programResult.snapshotCreated}, Changes: ${programResult.changesDetected}`
          );

          return { program, programResult };
        })
      );

      // Process results and update counters
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const { program, programResult } = promiseResult.value;
          result.programsChecked++;
          if (programResult.snapshotCreated) {
            result.snapshotsCreated++;
          }
          result.changesDetected += programResult.changesDetected;
        } else {
          // Handle rejected promise
          const errorMessage = promiseResult.reason instanceof Error
            ? promiseResult.reason.message
            : "Unknown error";

          // Try to extract program info from error context
          console.error(`Error monitoring program:`, promiseResult.reason);

          result.errors.push({
            programId: 'unknown',
            error: errorMessage,
          });

          await logMonitoringEvent(
            runId,
            null,
            "error",
            `Failed to monitor program: ${errorMessage}`
          );
        }
      }
    };

    // Process programs in batches
    for (let i = 0; i < programs.length; i += CONCURRENCY_LIMIT) {
      const batch = programs.slice(i, i + CONCURRENCY_LIMIT);
      await processBatch(batch);
    }

    // Log completion
    await logMonitoringEvent(
      runId,
      null,
      "info",
      `Monitoring run completed. Programs: ${result.programsChecked}, Snapshots: ${result.snapshotsCreated}, Changes: ${result.changesDetected}, Errors: ${result.errors.length}`
    );

    console.log(`Monitoring run ${runId} completed:`, result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Fatal error in monitoring run:", error);

    await logMonitoringEvent(
      runId,
      null,
      "error",
      `Fatal monitoring error: ${errorMessage}`
    );

    result.errors.push({
      programId: "SYSTEM",
      error: errorMessage,
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Monitors a single program for IDL changes
 */
async function monitorProgram(
  runId: string,
  connection: any,
  program: any
): Promise<{
  snapshotCreated: boolean;
  changesDetected: number;
}> {
  // Fetch current IDL from chain
  const currentIdl = await fetchIdlFromChain(connection, program.program_id);

  if (!currentIdl) {
    throw new Error("Failed to fetch IDL from chain");
  }

  // Calculate IDL hash
  const idlHash = calculateIdlHash(currentIdl);

  // Check if we already have this snapshot
  const exists = await snapshotExists(program.id, idlHash);

  if (exists) {
    console.log(`IDL unchanged for program ${program.name}`);
    return {
      snapshotCreated: false,
      changesDetected: 0,
    };
  }

  // Get the latest snapshot for comparison
  const latestSnapshot = await getLatestSnapshot(program.id);

  // Create new snapshot
  const newSnapshot = await createSnapshot(program.id, idlHash, currentIdl);
  console.log(`Created new snapshot for program ${program.name}`);

  // Detect changes
  const oldIdl = latestSnapshot?.idl_content || null;
  const changes = detectChanges(oldIdl, currentIdl);

  let changesDetected = 0;

  if (changes.length > 0) {
    console.log(
      `Detected ${changes.length} changes for program ${program.name}`
    );

    // Store changes in database
    await createChanges(
      program.id,
      latestSnapshot?.id || null,
      newSnapshot.id,
      changes
    );

    changesDetected = changes.length;
  }

  return {
    snapshotCreated: true,
    changesDetected,
  };
}

/**
 * Logs monitoring events to the database
 */
async function logMonitoringEvent(
  runId: string,
  programId: string | null,
  level: "info" | "warning" | "error",
  message: string,
  metadata?: any
): Promise<void> {
  try {
    await supabaseAdmin.from("monitoring_logs").insert({
      run_id: runId,
      program_id: programId,
      log_level: level,
      message,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log monitoring event:", error);
    // Don't throw here to avoid breaking the monitoring flow
  }
}

/**
 * Gets dashboard statistics for the UI
 * Cached for 60 seconds to reduce database load
 */
export async function getDashboardStats(): Promise<{
  totalPrograms: number;
  activePrograms: number;
  totalChanges: number;
  recentChanges: number;
  lastMonitoringRun: string | null;
}> {
  return cache.getOrCompute(
    CacheKeys.DASHBOARD_STATS,
    async () => {
      try {
        // Get total and active programs count
        const { data: programs, error: programsError } = await supabaseAdmin
          .from("monitored_programs")
          .select("id, is_active");

        if (programsError) {
          console.error("Error fetching programs:", programsError);
          throw new Error(`Failed to fetch programs: ${programsError.message}`);
        }

        const totalPrograms = programs?.length ?? 0;
        const activePrograms =
          programs?.filter((p) => p.is_active).length ?? 0;

        // Get total changes count
        const { count: totalChanges, error: changesError } = await supabaseAdmin
          .from("idl_changes")
          .select("*", { count: "exact", head: true });

        if (changesError) {
          console.error("Error fetching total changes:", changesError);
          throw new Error(`Failed to fetch changes: ${changesError.message}`);
        }

        // Get recent changes (last 24 hours)
        const twentyFourHoursAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();
        const { count: recentChanges, error: recentError } = await supabaseAdmin
          .from("idl_changes")
          .select("*", { count: "exact", head: true })
          .gte("detected_at", twentyFourHoursAgo);

        if (recentError) {
          console.error("Error fetching recent changes:", recentError);
          throw new Error(
            `Failed to fetch recent changes: ${recentError.message}`
          );
        }

        // Get last monitoring run time
        const { data: lastLog, error: logError } = await supabaseAdmin
          .from("monitoring_logs")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastMonitoringRun = lastLog?.created_at ?? null;

        return {
          totalPrograms,
          activePrograms,
          totalChanges: totalChanges ?? 0,
          recentChanges: recentChanges ?? 0,
          lastMonitoringRun,
        };
      } catch (error) {
        console.error("Error getting dashboard stats:", error);
        throw error;
      }
    },
    CacheTTL.DASHBOARD_STATS
  );
}

/**
 * Gets monitoring system statistics
 */
export async function getMonitoringStats(): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunTime: string | null;
  averageDuration: number;
}> {
  // Get unique run IDs and their completion status
  const { data: runs, error } = await supabaseAdmin
    .from("monitoring_logs")
    .select("run_id, log_level, created_at, metadata")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching monitoring stats:", error);
    throw new Error(`Failed to fetch monitoring stats: ${error.message}`);
  }

  if (!runs || runs.length === 0) {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRunTime: null,
      averageDuration: 0,
    };
  }

  // Group by run_id
  const runGroups = new Map<string, any[]>();

  for (const log of runs) {
    if (!runGroups.has(log.run_id)) {
      runGroups.set(log.run_id, []);
    }
    runGroups.get(log.run_id)!.push(log);
  }

  let successfulRuns = 0;
  let failedRuns = 0;
  let totalDuration = 0;
  let durationCount = 0;
  let lastRunTime: string | null = null;

  for (const [runId, logs] of runGroups) {
    const hasError = logs.some((log) => log.log_level === "error");
    const completionLog = logs.find(
      (log) =>
        log.message?.includes("completed") || log.message?.includes("Fatal")
    );

    if (hasError) {
      failedRuns++;
    } else {
      successfulRuns++;
    }

    // Get duration from metadata if available
    if (completionLog?.metadata?.duration) {
      totalDuration += completionLog.metadata.duration;
      durationCount++;
    }

    // Update last run time
    const runTime = logs[0]?.created_at;
    if (runTime && (!lastRunTime || runTime > lastRunTime)) {
      lastRunTime = runTime;
    }
  }

  return {
    totalRuns: runGroups.size,
    successfulRuns,
    failedRuns,
    lastRunTime,
    averageDuration:
      durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
  };
}
