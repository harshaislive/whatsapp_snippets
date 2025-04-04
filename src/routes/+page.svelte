<script lang="ts">
  import FilterBar from '../lib/components/FilterBar.svelte';
  import SnippetList from '../lib/components/SnippetList.svelte';
  import { onMount } from 'svelte';
  import type {
    RealtimeChannel,
    RealtimePostgresChangesPayload,
    REALTIME_SUBSCRIBE_STATES
  } from '@supabase/supabase-js';
  import { supabase } from '../lib/supabaseClient';

  // Change the title in the browser
  const pageTitle = 'WhatsApp Snippets | Beforest';
  onMount(() => {
    document.title = pageTitle;
  });

  // --- Define Snippet Type (Adjust based on your actual table schema) ---
  interface Snippet {
    id: number | string;
    timestamp: string;
    sender_name?: string | null;
    sender_jid?: string | null;
    content: string;
    caption?: string | null;
    message_type?: string;
  }

  // Type guard to check if an object is a valid Snippet
  function isValidSnippet(obj: any): obj is Snippet {
      return obj && typeof obj === 'object' && 'id' in obj && 'timestamp' in obj && 'content' in obj;
  }

  // --- State ---
  let startDate: string | null = null;
  let endDate: string | null = null;
  let snippets: Snippet[] = [];
  let loading: boolean = true;
  let errorMessage: string | null = null;
  let channel: RealtimeChannel | null = null;
  let initialLoadComplete = false; // Flag to prevent refetch on mount

  // --- Functions ---
  async function fetchSnippets() {
    loading = true;
    errorMessage = null;
    console.log(`Fetching snippets between ${startDate || 'beginning'} and ${endDate || 'end'}`);

    try {
      let query = supabase
        .from('whatsapp_snippets')
        .select('*')
        .order('timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('timestamp', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query = query.lte('timestamp', `${endDate}T23:59:59.999Z`);
      }

      const { data, error } = await query.returns<Snippet[]>();

      if (error) {
        throw error;
      }

      snippets = data || [];
      console.log(`Fetched ${snippets.length} snippets.`);

    } catch (error: any) {
      console.error("Error fetching snippets:", error);
      errorMessage = `Failed to fetch snippets: ${error.message}`;
      snippets = [];
    } finally {
      loading = false;
      // Set flag after first *successful* fetch or error
      // Place it here if you want reactive changes only after first attempt completes
      // If placed in onMount, it triggers immediately after mount regardless of fetch status
      if (!initialLoadComplete) initialLoadComplete = true;
    }
  }

  function setupRealtimeSubscription() {
    if (channel) {
      supabase.removeChannel(channel);
      console.log("Removed existing Supabase channel.");
    }

    console.log("Setting up Supabase real-time subscription...");
    channel = supabase
      .channel('whatsapp_snippets_realtime')
      .on<Snippet>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_snippets' },
        (payload: RealtimePostgresChangesPayload<Snippet>) => {
          // Use the type guard to ensure payload.new is a valid Snippet
          if (isValidSnippet(payload.new)) {
              const newSnippet = payload.new; // Now TypeScript knows it's a Snippet
              console.log('New valid snippet received:', newSnippet);

              const newTimestamp = new Date(newSnippet.timestamp);
              const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
              const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

              const shouldAdd = (!start && !end) ||
                                (start && !end && newTimestamp >= start) ||
                                (!start && end && newTimestamp <= end) ||
                                (start && end && newTimestamp >= start && newTimestamp <= end);

              if (shouldAdd) {
                 console.log("Adding snippet to list based on current filters.");
                 snippets = [newSnippet, ...snippets];
              } else {
                  console.log("New snippet received but does not match current date filters.");
              }
          } else {
              // Log if payload.new is received but not a valid Snippet (e.g., empty object)
              if (payload.new) {
                  console.warn("Received payload.new, but it was not a valid Snippet:", payload.new);
              }
          }
        }
      )
      // Use more specific types for subscribe callback
      .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}` | 'error' | 'ok' , err?: Error) => {
         if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates!');
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'error') {
            console.error(`Subscription error: ${status}`, err);
            errorMessage = `Real-time connection error: ${err?.message || 'Unknown error'}. Try refreshing.`;
         } else {
            // status can be 'CLOSED', 'SUBSCRIPTION_ERROR', 'ok'
            console.log(`Subscription status: ${status}`);
         }
      });

      console.log("Channel subscription initiated:", channel);
  }

  // --- Lifecycle ---
  onMount(() => {
    fetchSnippets();
    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log("Removed Supabase channel on component destroy.");
      }
    };
  });

  // --- Reactive Statements ---
  // Refetch when date filters change, but only *after* the initial fetch has completed.
  $: {
     if (initialLoadComplete && (startDate || endDate)) {
        console.log("Date filter changed, refetching...");
        fetchSnippets();
     } else if (initialLoadComplete && startDate === null && endDate === null) {
        // Handle case where filters are cleared - refetch all
        console.log("Date filters cleared, refetching all...");
        fetchSnippets();
     }
  }

</script>

<main class="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 font-body">
  <h1 class="text-3xl sm:text-4xl font-display font-bold text-brand-deep-blue mb-6 text-center">
    WhatsApp Snippets
  </h1>

  <!-- Filter Bar -->
  <FilterBar bind:startDate bind:endDate />

  <!-- Error Message Display -->
  {#if errorMessage}
    <div class="bg-brand-rich-red/10 border border-brand-rich-red text-brand-rich-red px-4 py-3 rounded relative mb-4" role="alert">
      <strong class="font-bold">Error:</strong>
      <span class="block sm:inline">{errorMessage}</span>
    </div>
  {/if}

  <!-- Snippet List -->
  <SnippetList {snippets} {loading} />

</main> 