<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from './lib/stores/authStore';
  import Login from './lib/components/Login.svelte';
  import FilterBar from './lib/components/FilterBar.svelte';
  import SnippetList from './lib/components/SnippetList.svelte';
  import type {
    RealtimeChannel,
    RealtimePostgresChangesPayload,
    REALTIME_SUBSCRIBE_STATES
  } from '@supabase/supabase-js';
  import { supabase } from './lib/supabaseClient';
  import { tick } from 'svelte';

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
    group_name?: string | null;
    is_group?: boolean;
    raw_message?: any;
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
  let loadingMore: boolean = false;
  let errorMessage: string | null = null;
  let channel: RealtimeChannel | null = null;
  let initialLoadComplete = false;
  let showSuccessToast = false;
  let newMessageCount = 0;
  let canLoadMore = true;
  const snippetsPerPage = 20;
  let activeQuickFilter = 'All Time';
  let isDarkMode: boolean = false;
  let searchQuery = '';
  let debouncedSearchQuery = '';
  let searchTimeout: ReturnType<typeof setTimeout>;
  let showGroupMessagesOnly = false;

  // --- Reactive State for Grouping ---
  let groupedSnippets: Record<string, Snippet[]> = {};
  let sortedGroupLabels: string[] = [];

  // --- Functions ---
  async function fetchSnippets(loadMore = false) {
    if (loadingMore && loadMore) return;
    if (!canLoadMore && loadMore) return;

    if (loadMore) {
      loadingMore = true;
    } else {
      loading = true;
      snippets = [];
      canLoadMore = true;
    }
    errorMessage = null;

    const currentOffset = loadMore ? snippets.length : 0;
    console.log(`[DEBUG] fetchSnippets called with filter: ${activeQuickFilter}`);

    try {
      let query = supabase
        .from('whatsapp_snippets')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(currentOffset, currentOffset + snippetsPerPage - 1);

      // Apply group filter if enabled
      if (showGroupMessagesOnly) {
        query = query.eq('is_group', true);
      }

      // Apply date filters based on activeQuickFilter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (activeQuickFilter) {
        case 'Today':
          const todayStr = today.toISOString().split('T')[0];
          query = query
            .gte('timestamp', `${todayStr}T00:00:00.000Z`)
            .lte('timestamp', `${todayStr}T23:59:59.999Z`);
          break;
          
        case 'Yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          query = query
            .gte('timestamp', `${yesterdayStr}T00:00:00.000Z`)
            .lte('timestamp', `${yesterdayStr}T23:59:59.999Z`);
          break;
          
        case 'Last 7 Days':
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 6);
          query = query
            .gte('timestamp', `${sevenDaysAgo.toISOString().split('T')[0]}T00:00:00.000Z`)
            .lte('timestamp', `${today.toISOString().split('T')[0]}T23:59:59.999Z`);
          break;
          
        case 'Last 30 Days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 29);
          query = query
            .gte('timestamp', `${thirtyDaysAgo.toISOString().split('T')[0]}T00:00:00.000Z`)
            .lte('timestamp', `${today.toISOString().split('T')[0]}T23:59:59.999Z`);
          break;
          
        case 'Custom Range':
          if (startDate) {
            query = query.gte('timestamp', `${startDate}T00:00:00.000Z`);
          }
          if (endDate) {
            query = query.lte('timestamp', `${endDate}T23:59:59.999Z`);
          }
          break;
          
        case 'All Time':
        default:
          // No date filters for 'All Time'
          break;
      }

      console.log('[DEBUG] Executing query with filter:', activeQuickFilter);
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      console.log(`[DEBUG] Query returned ${data?.length || 0} snippets`);
      
      const fetchedSnippets = data || [];

      if (loadMore) {
        snippets = [...snippets, ...fetchedSnippets];
      } else {
        snippets = fetchedSnippets;
      }

      if (count === null || snippets.length >= count) {
        console.log("[DEBUG] No more snippets to load");
        canLoadMore = false;
      }

    } catch (error: any) {
      console.error("Error fetching snippets:", error);
      errorMessage = `Failed to fetch snippets: ${error.message}`;
      if (!loadMore) snippets = [];
    } finally {
      if (loadMore) {
        loadingMore = false;
      } else {
        loading = false;
        if (!initialLoadComplete) initialLoadComplete = true;
      }
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
                 showNewMessageNotification();
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
  
  // Show success toast when new messages arrive
  function showNewMessageNotification() {
    newMessageCount++;
    showSuccessToast = true;
    setTimeout(() => {
      showSuccessToast = false;
      newMessageCount = 0;
    }, 3000);
  }

  // --- Logout Function ---
  async function handleLogout() {
    try {
      loading = true; // Show loading indicator during logout
      errorMessage = null;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('User logged out successfully.');
      // The reactive $user store update will automatically show the Login component.
      // Reset state potentially sensitive or user-specific if needed, though
      // App remount on login/logout often handles this.
      snippets = [];
      initialLoadComplete = false; 
      startDate = null;
      endDate = null;
      activeQuickFilter = 'All Time';
    } catch (error: any) {
      console.error('Error logging out:', error);
      errorMessage = `Logout failed: ${error.message}`;
    } finally {
      loading = false; // Hide loading indicator
    }
  }

  // --- Date Grouping Logic ---
  function getRelativeDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      // Format older dates as Month Day, Year
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }

  $: filteredSnippets = snippets.filter(snippet => {
    // Apply group messages filter first
    if (showGroupMessagesOnly && !snippet.is_group) {
      return false;
    }
    
    // Then apply search query filter
    if (!debouncedSearchQuery) return true;
    
    const query = debouncedSearchQuery.toLowerCase();
    const sender = (snippet.sender_name || snippet.sender_jid || '').toLowerCase();
    const content = (snippet.content || '').toLowerCase();
    const caption = (snippet.caption || '').toLowerCase();
    const groupName = (snippet.group_name || '').toLowerCase();
    
    return sender.includes(query) || 
           content.includes(query) || 
           caption.includes(query) ||
           groupName.includes(query);
  });

  // Moved grouping logic into its own reactive block
  $: {
    console.log(`[DEBUG] Grouping logic triggered. Filter: ${activeQuickFilter}, Snippets: ${filteredSnippets.length}`);

    if (activeQuickFilter === 'All Time') {
      // For 'All Time', use chronological grouping by month
      const groups = filteredSnippets.reduce((acc, snippet) => {
        const date = new Date(snippet.timestamp);
        const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        
        if (!acc[monthLabel]) {
          acc[monthLabel] = [];
        }
        acc[monthLabel].push(snippet);
        return acc;
      }, {} as Record<string, Snippet[]>);
      
      groupedSnippets = groups;
      sortedGroupLabels = Object.keys(groups).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      });
    } else {
      // For other filters, use daily grouping
      const groups = filteredSnippets.reduce((acc, snippet) => {
        const snippetDate = new Date(snippet.timestamp);
        const label = getRelativeDateLabel(snippetDate);
        
        if (!acc[label]) {
          acc[label] = [];
        }
        acc[label].push(snippet);
        return acc;
      }, {} as Record<string, Snippet[]>);
      
      groupedSnippets = groups;
      sortedGroupLabels = Object.keys(groups).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        
        try {
          return new Date(b).getTime() - new Date(a).getTime();
        } catch (e) {
          return 0;
        }
      });
    }
    
    console.log(`[DEBUG] Grouped into ${sortedGroupLabels.length} groups:`, sortedGroupLabels);
  }
  
  // --- Dark Mode Logic ---
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    updateTheme(isDarkMode);
  }

  function updateTheme(dark: boolean) {
    if (typeof window !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }
  
  // Check initial theme preference on mount
  onMount(() => {
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
      } else {
        isDarkMode = prefersDark;
      }
      updateTheme(isDarkMode);
      
      // Listen for OS theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (!localStorage.getItem('theme')) { // Only update if no theme is explicitly set
            isDarkMode = event.matches;
            updateTheme(isDarkMode);
        }
      });
    }
    
    // Title setting, fetch, and subscription setup
    document.title = pageTitle;
    fetchSnippets();
    setupRealtimeSubscription();

    // Cleanup function for subscription and theme listener
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => {}); // Approximation, requires named function for perfect removal
      }
    };
  });

  // --- Reactive Statements ---
  // Simplified filter change handler
  $: if (initialLoadComplete) {
    console.log(`[DEBUG] Filter changed to: ${activeQuickFilter}`);
    fetchSnippets(false);
  }
  
  // Refetch when group filter changes
  $: if (initialLoadComplete && showGroupMessagesOnly !== undefined) {
    console.log("Group filter changed, refetching first page...");
    fetchSnippets(false); // Fetch the first page
  }
  
  // --- Infinite Scroll Logic ---
  let sentinel: HTMLElement;
  onMount(() => {
      const observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && canLoadMore && !loading && !loadingMore) {
              console.log("Sentinel intersecting, loading more...");
              fetchSnippets(true);
          }
      });

      if (sentinel) {
          observer.observe(sentinel);
      }

      return () => {
          if (sentinel) {
              observer.unobserve(sentinel);
          }
      };
  });

  // --- Search Logic ---
  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      debouncedSearchQuery = searchQuery.trim().toLowerCase();
      console.log('Debounced search query:', debouncedSearchQuery);
      // Filtering happens reactively based on debouncedSearchQuery
    }, 300); // Debounce delay of 300ms
  }
</script>

{#if $user}
  <div class="min-h-screen bg-gray-50 dark:bg-brand-dark-earth">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-30 h-header dark:bg-brand-dark-brown dark:border-brand-charcoal-gray/40">
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
        <div class="flex items-center justify-between h-full">
          <!-- Left: Logo & Title -->
          <div class="flex items-center">
            <div class="flex items-center">
              <!-- Logo container with both versions -->
              <div class="relative w-20 h-20">
                <img
                  src="/Beforest - Green.png"
                  alt="Beforest Logo"
                  class="absolute inset-0 w-full h-full object-contain dark:opacity-0 transition-opacity duration-200"
                />
                <img
                  src="/Beforest - White.png"
                  alt="Beforest Logo"
                  class="absolute inset-0 w-full h-full object-contain opacity-0 dark:opacity-100 transition-opacity duration-200"
                />
              </div>
            </div>
          </div>
          
          <!-- Center: Search -->
          <div class="flex-1 flex justify-center px-8 lg:ml-6 lg:justify-end">
            <div class="max-w-lg w-full lg:max-w-xs">
              <label for="search" class="sr-only">Search snippets</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input 
                  id="search" 
                  name="search" 
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-forest-green focus:border-brand-forest-green sm:text-sm dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white dark:placeholder-gray-400 dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue" 
                  placeholder="Search snippets..." 
                  type="search"
                  bind:value={searchQuery} 
                  on:input={handleSearchInput} 
                >
              </div>
            </div>
          </div>
          
          <!-- Right: Icons -->
          <div class="flex items-center space-x-4">
            <button 
              type="button" 
              class="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:text-gray-300 dark:hover:text-white dark:focus:ring-brand-light-blue dark:ring-offset-brand-dark-brown transition-colors duration-200"
              on:click={toggleTheme}
              aria-label="Toggle theme"
            >
              {#if isDarkMode}
                <!-- Sun Icon (for light mode) -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              {:else}
                <!-- Moon Icon (for dark mode) -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              {/if}
            </button>

            <!-- Logout Button (New) -->
            <button 
              type="button" 
              class="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:text-gray-300 dark:hover:text-white dark:focus:ring-brand-light-blue dark:ring-offset-brand-dark-brown transition-colors duration-200"
              on:click={handleLogout}
              aria-label="Logout"
            >
              <!-- Logout Icon (Heroicon: logout) -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Sub-header/Filter Area -->
    <div class="sticky top-header z-20 bg-white shadow-sm dark:bg-brand-dark-brown/95 dark:border-b dark:border-brand-charcoal-gray/40">
      <div class="container mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <!-- Filter Controls Section -->
        <div class="space-y-4">
          <!-- Date Filters -->
          <FilterBar bind:activeQuickFilter={activeQuickFilter} bind:startDate={startDate} bind:endDate={endDate} />
          
          <!-- Group Messages Filter Toggle -->
          <div class="flex w-full justify-start">
            <label for="group-messages-toggle" class="inline-flex items-center cursor-pointer">
              <input 
                id="group-messages-toggle" 
                type="checkbox" 
                bind:checked={showGroupMessagesOnly}
                class="sr-only peer"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-forest-green dark:peer-focus:ring-brand-light-blue rounded-full peer dark:bg-brand-charcoal-gray/60 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-forest-green dark:peer-checked:bg-brand-light-blue"></div>
              <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Group Messages Only</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <main class="container mx-auto max-w-7xl p-4 pt-6 sm:p-6 lg:px-8 font-body">
      <!-- Toast Notification for Loading -->
      {#if loading}
        <div class="fixed bottom-4 right-4 z-50 bg-white dark:bg-brand-charcoal-gray/80 shadow-lg rounded-lg p-4 flex items-center space-x-3 border border-gray-100 dark:border-brand-charcoal-gray/60">
          <svg class="animate-spin h-5 w-5 text-brand-forest-green dark:text-brand-light-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-gray-700 dark:text-white text-sm font-medium">Loading snippets...</span>
        </div>
      {/if}

      <!-- Error Message Display -->
      {#if errorMessage && !loading}
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-md dark:bg-red-900/30 dark:border-red-400 dark:text-red-200" role="alert">
          <p class="font-bold">Error Loading Snippets</p>
          <p>{errorMessage}</p>
        </div>
      {/if}

      <!-- Snippet List -->
      <div class="mt-6">
        <SnippetList {groupedSnippets} {sortedGroupLabels} {loading} {loadingMore} />
      </div>
      
      <!-- Sentinel Element for Infinite Scroll -->
      {#if !canLoadMore && !loading}
        <div bind:this={sentinel} class="h-4 w-full my-8"></div>
      {/if}

      <!-- Footer -->
      <footer class="mt-12 py-6 text-center text-xs text-gray-500 dark:text-gray-300">
        <p>© {new Date().getFullYear()} Beforest Snippets. All rights reserved.</p>
      </footer>
    </main>
  </div>
{:else}
  <Login />
{/if}
