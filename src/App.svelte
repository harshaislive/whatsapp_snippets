<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { user } from './lib/stores/authStore';
  import Login from './lib/components/Login.svelte';
  import FilterBar from './lib/components/FilterBar.svelte';
  import SnippetList from './lib/components/SnippetList.svelte';
  import Pagination from './lib/components/Pagination.svelte';
  import type {
    RealtimeChannel,
    RealtimePostgresChangesPayload,
    REALTIME_SUBSCRIBE_STATES
  } from '@supabase/supabase-js';
  import { supabase } from './lib/supabaseClient';
  import { tick } from 'svelte';
  import { fade } from 'svelte/transition';

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
  let errorMessage: string | null = null;
  let channel: RealtimeChannel | null = null;
  let initialLoadComplete = false;
  let showSuccessToast = false;
  let newMessageCount = 0;
  const snippetsPerPage = 20;
  let currentPage = 1;
  let totalPages = 0;
  let totalItems = 0;
  let activeQuickFilter = 'All Time';
  let isDarkMode: boolean = false;
  let searchQuery = '';
  let debouncedSearchQuery = '';
  let searchTimeout: ReturnType<typeof setTimeout>;
  let showGroupMessagesOnly = import.meta.env.VITE_DEFAULT_GROUP_MESSAGES_ONLY === 'true';
  let blockedJids: string[] = [];

  // --- Reactive State for Grouping ---
  let groupedSnippets: Record<string, Snippet[]> = {};
  let sortedGroupLabels: string[] = [];

  // Add to top of script block
  let showMobileSearch = false;

  // ADDED handler function for pagination events
  function handlePageChange(event: CustomEvent<{ page: number }>) {
    const newPage = event.detail.page;
    console.log(`[App] Page change event received. Fetching page: ${newPage}`);
    // Scroll to top before fetching new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Use existing date range filters when changing page
    fetchSnippets(newPage, startDate, endDate);
  }

  // Function to fetch blocked JIDs
  async function fetchBlockedJids() {
    try {
      const { data, error } = await supabase
        .from('blocked_jids')
        .select('jid');
      
      if (error) throw error;
      
      blockedJids = data.map(row => row.jid);
      console.log('[DEBUG] Fetched blocked JIDs:', blockedJids);
    } catch (error: any) {
      console.error('Error fetching blocked JIDs:', error);
      // Don't show this error to users, just log it
      blockedJids = [];
    }
  }

  // --- Functions ---
  async function fetchSnippets(page: number, fetchStartDate: string | null = null, fetchEndDate: string | null = null) {
    // Determine the effective dates to use for this specific fetch operation
    // Prioritize passed parameters, fall back to component state
    const effectiveStartDate = fetchStartDate !== null ? fetchStartDate : startDate;
    const effectiveEndDate = fetchEndDate !== null ? fetchEndDate : endDate;

    // Reset state for a new fetch (not loading more)
    loading = true;
    errorMessage = null;

    // Calculate offset based on page number
    const currentOffset = (page - 1) * snippetsPerPage;
    console.log(`[DEBUG] fetchSnippets called. Page: ${page}, Filter: ${activeQuickFilter}`);
    console.log(`[DEBUG] Using effective dates: Start=${effectiveStartDate || 'none'}, End=${effectiveEndDate || 'none'}`);

    try {
      // Ensure blocked JIDs are loaded
      if (blockedJids.length === 0) {
        await fetchBlockedJids();
      }

      let query = supabase
        .from('whatsapp_snippets')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Exclude blocked JIDs if any exist
      if (blockedJids.length > 0) {
        // Use individual not.eq filters instead of not.in for better handling of special characters
        blockedJids.forEach(jid => {
          query = query.not('sender_jid', 'eq', jid);
        });
      }

      // Apply pagination
      query = query.range(currentOffset, currentOffset + snippetsPerPage - 1);

      // Apply date filters based on the *effective* dates for this fetch
      if (effectiveStartDate) {
        console.log('[DEBUG] Applying start date filter');
        query = query.gte('timestamp', `${effectiveStartDate}T00:00:00.000Z`);
      }
      if (effectiveEndDate) {
        console.log('[DEBUG] Applying end date filter');
        query = query.lte('timestamp', `${effectiveEndDate}T23:59:59.999Z`);
      }

      // Apply search query filter (if debounced query exists)
      if (debouncedSearchQuery) {
        console.log('[DEBUG] Applying search filter:', debouncedSearchQuery);
        // Use ILIKE for case-insensitive search across multiple columns
        query = query.or(`content.ilike.%${debouncedSearchQuery}%,sender_name.ilike.%${debouncedSearchQuery}%,sender_jid.ilike.%${debouncedSearchQuery}%,group_name.ilike.%${debouncedSearchQuery}%,caption.ilike.%${debouncedSearchQuery}%`);
      }
      
      // Apply group filter if enabled (AFTER search)
      if (showGroupMessagesOnly) {
        query = query.eq('is_group', true);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      console.log(`[DEBUG] Query returned ${data?.length || 0} snippets. Total potential: ${count}`);
      
      const fetchedSnippets = data || [];

      // Always replace snippets with the fetched page data
      snippets = fetchedSnippets;

      // Update pagination state based on the count from Supabase
      totalItems = count || 0;
      totalPages = Math.ceil(totalItems / snippetsPerPage);
      currentPage = page; // Update current page to the page just fetched

      console.log(`[DEBUG] Updated state: currentPage=${currentPage}, totalPages=${totalPages}, totalItems=${totalItems}`);

    } catch (error: any) {
      console.error("Error fetching snippets:", error);
      errorMessage = `Failed to fetch snippets: ${error.message}`;
      snippets = []; // Clear snippets on error
      totalPages = 0;
      totalItems = 0;
      // Keep currentPage as is, or reset to 1? Maybe keep.
    } finally {
      // Always set loading to false when fetch attempt finishes
      loading = false;
      // Mark initial load complete only after the *first* successful fetch attempt finishes
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
    console.log(`Grouping logic triggered. activeQuickFilter: ${activeQuickFilter}`);
    console.log(`Grouping ${filteredSnippets.length} filtered snippets.`);

    if (activeQuickFilter === 'All Time') {
      console.log("--> Grouping for 'All Time' filter.");
      // For 'All Time', use a single group with a special key containing all filtered snippets
      groupedSnippets = { '__ALL__': filteredSnippets }; 
      sortedGroupLabels = ['__ALL__'];
    } else {
      console.log("--> Grouping by date label.");
      // For other filters, use the daily grouping logic
      const groups = filteredSnippets.reduce((groups, snippet) => {
        try {
          const snippetDate = new Date(snippet.timestamp);
          const label = getRelativeDateLabel(snippetDate);
          if (!groups[label]) {
            groups[label] = [];
          }
          groups[label].push(snippet);
        } catch (e) {
          console.error("Error parsing date for grouping:", snippet.timestamp, e);
        }
        return groups;
      }, {} as Record<string, Snippet[]>);
      
      groupedSnippets = groups;

      // Sort the daily labels
      sortedGroupLabels = Object.keys(groupedSnippets).sort((a, b) => {
          if (a === 'Today') return -1;
          if (b === 'Today') return 1;
          if (a === 'Yesterday') return -1;
          if (b === 'Yesterday') return 1;
          // Sort older dates chronologically descending
          try {
              return new Date(b).getTime() - new Date(a).getTime();
          } catch (e) {
              return 0; // Fallback if date parsing fails
          }
      });
    }
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
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const themeChangeHandler = (event: MediaQueryListEvent) => {
        if (!localStorage.getItem('theme')) { // Only update if no theme is explicitly set
          isDarkMode = event.matches;
          updateTheme(isDarkMode);
        }
      };
      mediaQuery.addEventListener('change', themeChangeHandler);
    }
    
    // Title setting, fetch, and subscription setup
    document.title = pageTitle;
    fetchSnippets(1); // Fetch page 1 on initial load
    setupRealtimeSubscription();

    // Return cleanup function
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.removeEventListener('change', () => {});
      }
    };
  });

  // --- Reactive Statements ---
  // Update date filters based on active quick filter AND trigger fetch
  $: {
    console.log(`[DEBUG] Reactive block for activeQuickFilter triggered: ${activeQuickFilter}`);
    let newStartDate: string | null = null;
    let newEndDate: string | null = null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate the target date range based on the selected filter
    if (activeQuickFilter === 'Today') {
      newStartDate = todayStr;
      newEndDate = todayStr;
    } else if (activeQuickFilter === 'Yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      newStartDate = yesterday.toISOString().split('T')[0];
      newEndDate = newStartDate;
    } else if (activeQuickFilter === 'Last 7 Days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      newStartDate = start.toISOString().split('T')[0];
      newEndDate = todayStr;
    } else if (activeQuickFilter === 'Last 30 Days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      newStartDate = start.toISOString().split('T')[0];
      newEndDate = todayStr;
    } else if (activeQuickFilter === 'Custom Range') {
      // For Custom Range, we rely on the dates already set by the picker
      newStartDate = startDate; 
      newEndDate = endDate;
    } else { // 'All Time' or default
      newStartDate = null;
      newEndDate = null;
    }

    // Determine if a refetch is needed based on filter/date changes
    const datesActuallyChanged = newStartDate !== startDate || newEndDate !== endDate;
    
    // We only trigger fetch *after* the initial load is complete
    // And only if the dates calculated for the new filter differ from the current state
    if (initialLoadComplete && datesActuallyChanged) {
        console.log(`[DEBUG] Filter/Date change detected. New Range: ${newStartDate || 'none'} - ${newEndDate || 'none'}`);
        // Update component state first
        startDate = newStartDate;
        endDate = newEndDate;
        currentPage = 1; // Reset to page 1 for new filters
        
        // Then trigger a fetch for page 1 with the new dates
        fetchSnippets(currentPage, newStartDate, newEndDate); 
    } else if (initialLoadComplete) {
        console.log(`[DEBUG] Filter changed (${activeQuickFilter}), but calculated dates match current state (${startDate}, ${endDate}). No date-driven refetch.`);
    } else {
        console.log(`[DEBUG] Initial load not complete, skipping fetch trigger in date reactive block.`);
        // Update state even before initial load
        startDate = newStartDate;
        endDate = newEndDate;
    }
  }
  
  // Refetch when group filter changes, using the current date range state
  let previousShowGroupMessagesOnly: boolean | undefined = undefined; // Track previous state
  $: if (initialLoadComplete && showGroupMessagesOnly !== previousShowGroupMessagesOnly) {
    console.log(`[DEBUG] Group filter changed to ${showGroupMessagesOnly}. Refetching page 1 with current dates: ${startDate || 'none'} - ${endDate || 'none'}`);
    currentPage = 1; // Reset to page 1
    // Pass the current state dates to the fetch function for page 1
    fetchSnippets(currentPage, startDate, endDate); 
    previousShowGroupMessagesOnly = showGroupMessagesOnly; // Update previous state
  }
  
  // --- Search Logic ---
  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const newQuery = searchQuery.trim().toLowerCase();
      // Trigger fetch only if the debounced query actually changes
      if (newQuery !== debouncedSearchQuery) {
         debouncedSearchQuery = newQuery;
         console.log('Debounced search query changed:', debouncedSearchQuery, 'Refetching page 1.');
         currentPage = 1; // Reset to page 1 for new search
         fetchSnippets(currentPage, startDate, endDate); // Fetch page 1 with current dates/filters
      } else {
         console.log('Debounced search query unchanged:', debouncedSearchQuery);
      }
    }, 300); // Debounce delay of 300ms
  }
</script>

{#if $user}
  <div class="min-h-screen bg-gray-50 dark:bg-brand-dark-earth">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-30 flex flex-col dark:bg-brand-dark-brown dark:border-brand-charcoal-gray/40">
      <!-- Main Header Row -->
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
        <div class="flex items-center justify-between">
          <!-- Left: Logo & Title -->
          <div class="flex items-center">
            <div class="flex items-center">
              <!-- Logo container with both versions -->
              <div class="relative w-16 h-16 sm:w-20 sm:h-20">
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
          
          <!-- Center: Search on desktop, hidden on mobile -->
          <div class="hidden md:flex flex-1 items-center justify-center px-2 sm:px-8 lg:ml-6 lg:justify-end space-x-4">
            <!-- Date Filters (desktop only) -->
            <FilterBar bind:activeQuickFilter={activeQuickFilter} bind:startDate={startDate} bind:endDate={endDate} />

            <!-- Group Messages Filter Toggle (desktop only) -->
            <label for="group-messages-toggle-desktop" class="flex-shrink-0 inline-flex items-center cursor-pointer">
              <input 
                id="group-messages-toggle-desktop" 
                type="checkbox" 
                bind:checked={showGroupMessagesOnly}
                class="sr-only peer"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-forest-green dark:peer-focus:ring-brand-light-blue rounded-full peer dark:bg-brand-charcoal-gray/60 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-forest-green dark:peer-checked:bg-brand-light-blue"></div>
              <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:inline">Group Only</span>
            </label>

            <!-- Search Input (desktop only) -->
            <div class="w-full max-w-lg lg:max-w-xs">
              <label for="search-desktop" class="sr-only">Search snippets</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input 
                  id="search-desktop" 
                  name="search-desktop" 
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-forest-green focus:border-brand-forest-green text-sm dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white dark:placeholder-gray-400 dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue" 
                  placeholder="Search snippets..." 
                  type="search"
                  bind:value={searchQuery} 
                  on:input={handleSearchInput} 
                >
              </div>
            </div>
          </div>
          
          <!-- Right: Icons -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <!-- Mobile Search Button (Shows/hides mobile search bar) -->
            <button 
              type="button"
              class="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:text-gray-300 dark:hover:text-white dark:focus:ring-brand-light-blue dark:ring-offset-brand-dark-brown transition-colors duration-200"
              aria-label="Toggle Search"
              on:click={() => showMobileSearch = !showMobileSearch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <!-- Theme Toggle Button -->
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

            <!-- Logout Button -->
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

      <!-- Mobile Search (toggleable) -->
      {#if showMobileSearch}
        <div transition:fade="{{ duration: 150 }}" class="md:hidden bg-white dark:bg-brand-dark-brown border-t border-gray-200 dark:border-brand-charcoal-gray/40 py-2 px-4">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
            <input 
              id="search-mobile" 
              name="search-mobile" 
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-forest-green focus:border-brand-forest-green text-sm dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white dark:placeholder-gray-400 dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue" 
              placeholder="Search snippets..." 
              type="search"
              bind:value={searchQuery} 
              on:input={handleSearchInput} 
            >
          </div>
        </div>
      {/if}

      <!-- Mobile Filters (always shown on mobile) -->
      <div class="md:hidden bg-white dark:bg-brand-dark-brown border-t border-gray-200 dark:border-brand-charcoal-gray/40 py-2 px-4">
        <!-- Mobile Date Filters -->
        <FilterBar bind:activeQuickFilter={activeQuickFilter} bind:startDate={startDate} bind:endDate={endDate} />
        
        <!-- Mobile Group Messages Toggle -->
        <div class="mt-2">
          <label for="group-messages-toggle-mobile" class="inline-flex items-center cursor-pointer">
            <input 
              id="group-messages-toggle-mobile" 
              type="checkbox" 
              bind:checked={showGroupMessagesOnly}
              class="sr-only peer"
            >
            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-forest-green dark:peer-focus:ring-brand-light-blue rounded-full peer dark:bg-brand-charcoal-gray/60 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-forest-green dark:peer-checked:bg-brand-light-blue"></div>
            <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Group Messages Only</span>
          </label>
        </div>
      </div>
    </header>

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

      <!-- Snippets List -->
      <div class="mt-6">
        <SnippetList {groupedSnippets} {sortedGroupLabels} {loading} />
      </div>
      
      <!-- Pagination Component -->
      {#if !loading && totalPages > 0}
         <Pagination {currentPage} {totalPages} on:changePage={handlePageChange} />
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

<style>
  /* Remove unused styles */
</style>
