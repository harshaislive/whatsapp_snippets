"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Snippet } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/components/Login";
import { FilterBar } from "@/components/FilterBar";
import { SnippetCard } from "@/components/SnippetCard";
import { Pagination } from "@/components/Pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, LogOut } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const ITEMS_PER_PAGE = 50;

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch available groups using a database function for efficiency
  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      // Call the database function to get distinct group names
      const { data, error } = await supabase.rpc("get_unique_group_names");

      if (error) {
        // If RPC fails, fall back to client-side approach with pagination
        console.warn("RPC call failed, using fallback method:", error);

        const allGroups = new Set<string>();
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: pageData, error: pageError } = await supabase
            .from("whatsapp_snippets")
            .select("group_name")
            .not("group_name", "is", null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (pageError) throw pageError;

          if (pageData && pageData.length > 0) {
            pageData.forEach((item) => {
              if (item.group_name) allGroups.add(item.group_name);
            });
            page++;
            hasMore = pageData.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        const uniqueGroups = Array.from(allGroups).sort();
        setAvailableGroups(uniqueGroups);
        console.log(`Fetched ${uniqueGroups.length} groups using fallback pagination`);
        return;
      }

      // RPC returns array of objects with group_name property, extract the strings
      const uniqueGroups = (data || [])
        .map((item: { group_name: string }) => item.group_name)
        .sort();
      setAvailableGroups(uniqueGroups);
      console.log(`Fetched ${uniqueGroups.length} groups using RPC`);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  }, [user]);

  // Fetch total count for pagination
  const fetchTotalCount = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("whatsapp_snippets")
        .select("*", { count: "exact", head: true });

      if (startDate) {
        query = query.gte("timestamp", startOfDay(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte("timestamp", endOfDay(endDate).toISOString());
      }
      if (selectedGroup) {
        query = query.eq("group_name", selectedGroup);
      }
      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,caption.ilike.%${searchQuery}%,sender_name.ilike.%${searchQuery}%`);
      }

      const { count, error } = await query;
      if (error) throw error;

      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error fetching count:", err);
    }
  }, [user, startDate, endDate, selectedGroup, searchQuery]);

  // Fetch snippets with filters and pagination
  const fetchSnippets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("whatsapp_snippets")
        .select("*")
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (startDate) {
        query = query.gte("timestamp", startOfDay(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte("timestamp", endOfDay(endDate).toISOString());
      }
      if (selectedGroup) {
        query = query.eq("group_name", selectedGroup);
      }
      if (searchQuery) {
        query = query.or(`content.ilike.%${searchQuery}%,caption.ilike.%${searchQuery}%,sender_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.returns<Snippet[]>();
      if (error) throw error;

      setSnippets(data || []);
      console.log(`Fetched ${data?.length || 0} snippets for page ${currentPage}`);
    } catch (err) {
      console.error("Error fetching snippets:", err);
      setError(
        `Failed to fetch snippets: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, startDate, endDate, selectedGroup, searchQuery]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

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

          // Check if snippet matches current filters and is on page 1
          if (currentPage === 1) {
            const snippetDate = new Date(newSnippet.timestamp);
            const matchesDateFilter =
              (!startDate || snippetDate >= startOfDay(startDate)) &&
              (!endDate || snippetDate <= endOfDay(endDate));
            const matchesGroupFilter =
              !selectedGroup || newSnippet.group_name === selectedGroup;

            if (matchesDateFilter && matchesGroupFilter) {
              setSnippets((prev) => [newSnippet, ...prev].slice(0, ITEMS_PER_PAGE));
              setTotalCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentPage, startDate, endDate, selectedGroup]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchTotalCount();
      fetchSnippets();
    }
  }, [user, fetchGroups, fetchTotalCount, fetchSnippets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedGroup, searchQuery]);

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

  // Show login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <main className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">WhatsApp Snippets</h1>
        <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <FilterBar
        startDate={startDate}
        endDate={endDate}
        selectedGroup={selectedGroup}
        availableGroups={availableGroups}
        searchQuery={searchQuery}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onGroupChange={setSelectedGroup}
        onSearchChange={setSearchQuery}
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
        <>
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </main>
  );
}
