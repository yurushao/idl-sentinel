"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { AddToWatchlistButton } from "@/components/watchlist/add-to-watchlist-button";
import { usePrograms, useDeleteProgram } from "@/hooks/use-programs";

export function ProgramsList() {
  const { isAdmin, userId } = useAuth();
  const { data, isLoading } = usePrograms();
  const deleteMutation = useDeleteProgram();
  const programs = data?.programs || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredPrograms = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return programs;
    }
    return programs.filter(
      (program) =>
        program.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        program.program_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (program.description &&
          program.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    );
  }, [debouncedSearchTerm, programs]);

  const handleDelete = async (programId: string) => {
    if (!confirm("Are you sure you want to delete this program? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(programId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete program");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:w-64"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredPrograms.length} of {programs.length} programs
          </div>
        </div>

        <Link href="/programs/new" className="w-full sm:w-auto">
          <Button className="flex w-full items-center justify-center space-x-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Add Program</span>
          </Button>
        </Link>
      </div>

      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {programs.length === 0 ? (
              <div>
                <h3 className="mb-2 text-lg font-medium">No programs monitored yet</h3>
                <p className="mb-6 text-muted-foreground">
                  Start monitoring the first Solana program for IDL changes
                </p>
                <Link href="/programs/new">
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Program</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <h3 className="mb-2 text-lg font-medium">No programs found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrograms.map((program) => {
            const canManageProgram = isAdmin || program.owner_id === userId;

            return (
              <Card key={program.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{program.name}</h3>
                        <Badge variant={program.is_active ? "default" : "secondary"}>
                          {program.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {program.description && (
                        <p className="mb-3 text-muted-foreground">{program.description}</p>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-col text-sm sm:flex-row sm:items-center sm:space-x-2">
                          <span className="text-muted-foreground">Program ID:</span>
                          <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                            {program.program_id}
                          </code>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-0 sm:space-x-4">
                          <span>Added {formatRelativeTime(program.created_at)}</span>
                          <span>Updated {formatRelativeTime(program.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                      <AddToWatchlistButton
                        programId={program.program_id}
                        programDbId={program.id}
                        size="sm"
                        variant="outline"
                      />
                      <Link href={`/programs/${program.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      {canManageProgram && (
                        <>
                          <Link href={`/programs/${program.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1"
                            >
                              <Edit className="h-3 w-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(program.id)}
                            className="flex items-center space-x-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
