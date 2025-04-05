<script lang="ts">
  // Placeholder for SnippetList component
  // Will receive 'snippets' array as a prop
  import SnippetCard from './SnippetCard.svelte';
  import type { Snippet } from '../types'; // Assuming a types file

  // Type for a single snippet (should match App.svelte)
  interface Snippet {
    id: number | string;
    timestamp: string;
    // ... other fields
  }
  
  // Expect grouped snippets and sorted labels
  export let groupedSnippets: Record<string, Snippet[]> = {};
  export let sortedGroupLabels: string[] = [];
  export let loading: boolean = false; // For initial load
  export let loadingMore: boolean = false; // For subsequent loads

  // Calculate total snippets for empty check
  $: totalSnippets = sortedGroupLabels.reduce((sum, label) => sum + (groupedSnippets[label]?.length || 0), 0);

  // Number of skeleton cards to show while loading initially
  const initialSkeletonCount = 3;
</script>

{#if !loading && sortedGroupLabels.length === 0}
  <div class="text-center py-10">
    <p class="text-gray-500 dark:text-gray-400">No snippets found for the selected criteria.</p>
  </div>
{:else}
  <div class="space-y-8">
    {#each sortedGroupLabels as label (label)}
      {@const snippetsInGroup = groupedSnippets[label] || []}
      {#if snippetsInGroup.length > 0}
        <!-- Only show header if label is not the special '__ALL__' key -->
        {#if label !== '__ALL__'}
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-brand-charcoal-gray/50 pb-2 mb-4">
            {label}
          </h2>
        {/if}
        
        <div class="space-y-4">
          {#each snippetsInGroup as snippet (snippet.id)}
            <SnippetCard {snippet} />
          {/each}
        </div>
      {/if}
    {/each}

    {#if loadingMore}
      <div class="text-center py-4">
        <span class="text-gray-500 dark:text-gray-400">Loading more...</span>
      </div>
    {/if}
  </div>
{/if}

<div class="snippet-list">
  <!-- Initial Loading Skeletons -->
  {#if loading}
    <div class="mb-6 animate-fade-in" aria-live="polite" aria-busy="true">
      <div class="flex items-center justify-between py-2">
        <div class="text-sm font-medium text-brand-charcoal-gray dark:text-gray-300">
          <span class="inline-flex items-center">
            <svg class="animate-pulse-subtle w-4 h-4 mr-1 text-brand-deep-blue dark:text-brand-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading messages...
          </span>
        </div>
      </div>
      
      {#each Array(initialSkeletonCount) as _, i}
        <div class="card mb-4 animate-pulse bg-white dark:bg-brand-charcoal-gray/40 p-4 rounded-lg shadow-sm dark:shadow-md border border-gray-100 dark:border-brand-charcoal-gray/30">
          <div class="flex items-start">
            <!-- Skeleton Avatar -->
            <div class="flex-shrink-0 w-10 h-10 rounded-full mr-3 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60"></div>
            
            <div class="flex-1">
              <!-- Skeleton Header -->
              <div class="flex justify-between mb-3">
                <div class="h-4 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded w-1/3"></div>
                <div class="h-3 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded w-1/5"></div>
              </div>
              
              <!-- Skeleton Content -->
              <div class="space-y-2">
                <div class="h-4 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded"></div>
                <div class="h-4 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded w-5/6"></div>
                <div class="h-4 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded w-4/6"></div>
              </div>
              
              <!-- Skeleton Footer -->
              <div class="mt-4 h-3 bg-brand-soft-gray dark:bg-brand-charcoal-gray/60 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  <!-- Empty State -->
  {:else if totalSnippets === 0}
    <div class="text-center py-12 px-4">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-soft-gray/50 dark:bg-brand-charcoal-gray/50 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-brand-charcoal-gray dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 class="text-lg font-display font-medium text-brand-dark-earth dark:text-white mb-2">No messages found</h3>
      <p class="text-brand-charcoal-gray dark:text-gray-300 max-w-md mx-auto">
        No messages match your current filter criteria. Try adjusting your date range or check back later for new messages.
      </p>
    </div>
  <!-- Grouped Snippets List -->
  {:else}
    <div class="mb-4 animate-fade-in">
      {#each sortedGroupLabels as dateLabel (dateLabel)}
        <!-- Date Group Header -->
        <div class="sticky top-[124px] z-10 mb-3 pt-2 pb-1 backdrop-blur-sm bg-brand-off-white/90 dark:bg-brand-dark-brown/90 border-b border-gray-200 dark:border-brand-charcoal-gray/30">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-brand-charcoal-gray dark:text-gray-300 px-2">
            {dateLabel}
          </h3>
        </div>
        
        <!-- Masonry Grid for this Date Group -->
        <div class="columns-1 md:columns-2 lg:columns-3 gap-4 mb-8">
          {#each groupedSnippets[dateLabel] || [] as snippet (snippet.id)}
            <div class="break-inside-avoid mb-4">
              <SnippetCard {snippet} />
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Loading More Indicator -->
  {#if loadingMore}
    <div class="text-center py-6 animate-fade-in">
      <div class="inline-flex items-center text-brand-deep-blue dark:text-brand-light-blue">
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading more messages...
      </div>
    </div>
  {/if}
</div> 