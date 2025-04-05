<script lang="ts">
  // Placeholder for SnippetList component
  // Will receive 'snippets' array as a prop
  import SnippetCard from './SnippetCard.svelte';
  // No separate types file, Snippet type comes from App.svelte props

  // Type for a single snippet (should match App.svelte)
  // Removed redundant local interface definition
  
  // Expect grouped snippets and sorted labels
  export let groupedSnippets: Record<string, any[]>;
  export let sortedGroupLabels: string[];
  export let loading = false;
  export let loadingMore = false;

  // Calculate total snippets for empty check
  $: totalSnippets = sortedGroupLabels.reduce((sum, label) => sum + (groupedSnippets[label]?.length || 0), 0);

  // Number of skeleton cards to show while loading initially
  const initialSkeletonCount = 3;
</script>

<div class="space-y-8">
  {#each sortedGroupLabels as groupLabel}
    <div class="space-y-4">
      <!-- Group Header -->
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {groupLabel}
      </h2>
      
      <!-- Masonry Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each groupedSnippets[groupLabel] as snippet (snippet.id)}
          <div class="bg-white dark:bg-brand-charcoal-gray/40 rounded-lg shadow-sm border border-gray-200 dark:border-brand-charcoal-gray/60 p-4 break-words">
            <!-- Message Content -->
            <div class="space-y-2">
              <!-- Sender Info -->
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {snippet.sender_name || snippet.sender_jid || 'Unknown Sender'}
                  </p>
                  {#if snippet.is_group}
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {snippet.group_name || 'Unknown Group'}
                    </p>
                  {/if}
                </div>
                <time class="text-xs text-gray-500 dark:text-gray-400" datetime={snippet.timestamp}>
                  {new Date(snippet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>

              <!-- Message Text -->
              <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {snippet.content}
              </div>

              <!-- Caption (if exists) -->
              {#if snippet.caption}
                <div class="text-sm text-gray-600 dark:text-gray-400 italic">
                  {snippet.caption}
                </div>
              {/if}

              <!-- Message Type Badge -->
              {#if snippet.message_type && snippet.message_type !== 'text'}
                <div class="mt-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-brand-charcoal-gray/60 text-gray-800 dark:text-gray-300">
                    {snippet.message_type}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Loading More Indicator -->
  {#if loadingMore}
    <div class="flex justify-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-forest-green dark:border-brand-light-blue"></div>
    </div>
  {/if}
</div> 