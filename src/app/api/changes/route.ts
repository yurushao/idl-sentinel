import { NextRequest, NextResponse } from "next/server";
import { getRecentChanges, getChangeStatistics } from "@/lib/db/changes";
import type { ChangeSeverity } from "@/lib/db/changes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const severity = searchParams.get("severity");
    const stats = searchParams.get("stats") === "true";
    const programId = searchParams.get("programId")?.trim() || undefined;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    // Return statistics if requested
    if (stats) {
      const statistics = await getChangeStatistics(programId);
      return NextResponse.json({ statistics });
    }

    // Filter by severity if provided
    if (severity) {
      const validSeverities: ChangeSeverity[] = ["low", "medium", "high", "critical"];
      if (!validSeverities.includes(severity as ChangeSeverity)) {
        return NextResponse.json(
          { error: "Invalid severity. Must be one of: low, medium, high, critical" },
          { status: 400 }
        );
      }

      const changes = await getRecentChanges(limit, {
        severity: severity as ChangeSeverity,
        programId,
      });
      return NextResponse.json({ changes });
    }

    // Get recent changes
    const changes = await getRecentChanges(limit, { programId });

    return NextResponse.json({ changes });
  } catch (error) {
    console.error("Error fetching changes:", error);
    return NextResponse.json({ error: "Failed to fetch changes" }, { status: 500 });
  }
}
