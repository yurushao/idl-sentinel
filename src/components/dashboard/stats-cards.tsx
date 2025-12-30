"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Blocks, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

interface MonitoringStats {
  totalPrograms: number;
  activePrograms: number;
  totalChanges: number;
  recentChanges: number;
  lastMonitoringRun?: string;
}

export function StatsCards() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/monitoring/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mb-1 h-6 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Error</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">Failed to load</div>
            <p className="text-xs text-muted-foreground">Unable to fetch statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cardConfigs = [
    {
      title: "Total Programs",
      value: stats.totalPrograms ?? 0,
      subtitle: `${stats.activePrograms ?? 0} active`,
      icon: Blocks,
    },
    // {
    //   title: "Active Programs",
    //   value: stats.activePrograms ?? 0,
    //   subtitle: "Currently monitored",
    //   icon: CheckCircle,
    // },
    {
      title: "Total Changes",
      value: stats.totalChanges ?? 0,
      subtitle: "All time detections",
      icon: TrendingUp,
    },
    {
      title: "Recent Changes",
      value: stats.recentChanges ?? 0,
      subtitle: "Last 24 hours",
      icon: Clock,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cardConfigs.map((config, index) => {
        const Icon = config.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {config.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(typeof config.value === "number" ? config.value : 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
