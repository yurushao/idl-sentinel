"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatRelativeTime,
  severityDotColors,
  severityBadgeColors,
  truncateString,
} from "@/lib/utils";
import { ExternalLink, Clock, AlertCircle } from "lucide-react";

interface IdlChange {
  id: string;
  program_id: string;
  change_type: string;
  severity: "low" | "medium" | "high" | "critical";
  change_summary: string;
  detected_at: string;
  monitored_programs?: {
    name: string;
    program_id: string;
  };
}

export function RecentChanges() {
  const [changes, setChanges] = useState<IdlChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentChanges();
  }, []);

  const fetchRecentChanges = async () => {
    try {
      const response = await fetch("/api/changes?limit=10");
      if (response.ok) {
        const data = await response.json();
        setChanges(data.changes || []);
      }
    } catch (error) {
      console.error("Error fetching recent changes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent Changes</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 rounded-lg border p-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted/50" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Recent Changes</CardTitle>
        </div>
        <Link
          href="/changes"
          className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>View all</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">No recent changes detected</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Changes will appear here when detected
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {changes.slice(0, 5).map((change) => (
              <Link
                key={change.id}
                href="/changes"
                className="flex items-start gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 sm:gap-3 cursor-pointer block"
              >
                <div
                  className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                    severityDotColors[change.severity] || "bg-gray-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {change.monitored_programs?.name || "Unknown Program"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {change.change_type}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          severityBadgeColors[change.severity] || "bg-gray-500 text-white"
                        }`}
                      >
                        {change.severity}
                      </Badge>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatRelativeTime(change.detected_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {truncateString(change.change_summary, 100)}
                  </p>
                </div>
              </Link>
            ))}
            {changes.length > 5 && (
              <div className="pt-4 text-center">
                <Link href="/changes" className="block sm:inline-block">
                  <button className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto">
                    View all {changes.length} changes
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
