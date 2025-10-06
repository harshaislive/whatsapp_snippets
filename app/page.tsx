"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Snippet } from "@/lib/supabase";
import { FilterBar } from "@/components/FilterBar";
import { SnippetCard } from "@/components/SnippetCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageSquare } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

export default function Home() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Fetch available groups
  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_snippets")
        .select("group_name")
        .eq("is_group", true)
        .not("group_name", "is", null);

      if (error) throw error;

      const uniqueGroups = [
        ...new Set(
          data?.map((item) => item.group_name).filter(Boolean) as string[]
        ),
      ].sort();

      setAvailableGroups(uniqueGroups);
      console.log(`Fetched ${uniqueGroups.length} groups:`, uniqueGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  }, []);

  // Fetch snippets with filters
  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("whatsapp_snippets")
        .select("*")
        .order("timestamp", { ascending: false });

      if (startDate) {
        const start = startOfDay(startDate).toISOString();
        query = query.gte("timestamp", start);
      }

      if (endDate) {
        const end = endOfDay(endDate).toISOString();
        query = query.lte("timestamp", end);
      }

      if (selectedGroup) {
        query = query.eq("group_name", selectedGroup);
      }

      const { data, error } = await query.returns<Snippet[]>();

      if (error) throw error;

      setSnippets(data || []);
      console.log(
        `Fetched ${data?.length || 0} snippets with filters:`,
        { startDate, endDate, selectedGroup }
      );
    } catch (err) {
      console.error("Error fetching snippets:", err);
      setError(`Failed to fetch snippets: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedGroup]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_snippets_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_snippets",
        },
        (payload) => {
          console.log("New snippet received:", payload.new);
          const newSnippet = payload.new as Snippet;

          // Check if snippet matches current filters
          const snippetDate = new Date(newSnippet.timestamp);
          const matchesDateFilter =
            (!startDate || snippetDate >= startOfDay(startDate)) &&
            (!endDate || snippetDate <= endOfDay(endDate));
          const matchesGroupFilter =
            !selectedGroup || newSnippet.group_name === selectedGroup;

          if (matchesDateFilter && matchesGroupFilter) {
            setSnippets((prev) => [newSnippet, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate, selectedGroup]);

  // Initial load
  useEffect(() => {
    fetchGroups();
    fetchSnippets();
  }, [fetchGroups, fetchSnippets]);

  // Group snippets by date
  const groupedSnippets = snippets.reduce((groups, snippet) => {
    const date = format(new Date(snippet.timestamp), "EEEE, MMMM d, yyyy");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(snippet);
    return groups;
  }, {} as Record<string, Snippet[]>);

  const dateLabels = Object.keys(groupedSnippets).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <main className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        WhatsApp Snippets
      </h1>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        selectedGroup={selectedGroup}
        availableGroups={availableGroups}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onGroupChange={setSelectedGroup}
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading messages...</span>
        </div>
      ) : snippets.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No messages found</h3>
          <p className="text-muted-foreground">
            No messages match your current filter criteria. Try adjusting your
            filters or check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateLabels.map((dateLabel) => (
            <div key={dateLabel}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sticky top-0 bg-background py-2 z-10 border-b">
                {dateLabel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSnippets[dateLabel].map((snippet) => (
                  <SnippetCard key={snippet.id} snippet={snippet} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
