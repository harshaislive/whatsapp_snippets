<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let currentPage: number = 1;
  export let totalPages: number = 1;

  const dispatch = createEventDispatcher<{ changePage: { page: number } }>();

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      console.log(`[Pagination] Dispatching changePage event for page: ${page}`);
      dispatch('changePage', { page: page });
    }
  }

  // Reactive variables for button disabled states
  $: isFirstPage = currentPage === 1;
  $: isLastPage = currentPage === totalPages || totalPages === 0; // Also handle case where totalPages is 0 initially

</script>

{#if totalPages > 1}
<nav class="flex items-center justify-between border-t border-gray-200 bg-gray-50 dark:bg-brand-dark-earth dark:border-brand-charcoal-gray/40 px-4 py-3 sm:px-6 mt-8 rounded-b-lg" aria-label="Pagination">
  <div class="flex-1 flex justify-between sm:justify-end">
    <button
      on:click={() => goToPage(currentPage - 1)}
      disabled={isFirstPage}
      class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:bg-brand-charcoal-gray/60 dark:border-brand-charcoal-gray/50 dark:text-gray-300 dark:hover:bg-brand-charcoal-gray/80 dark:focus:ring-brand-light-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      aria-label="Previous page"
    >
      Previous
    </button>
    <div class="hidden sm:block mx-4">
         <p class="text-sm text-gray-700 dark:text-gray-300">
              Page <span class="font-medium">{currentPage}</span> of <span class="font-medium">{totalPages}</span>
         </p>
    </div>
    <button
      on:click={() => goToPage(currentPage + 1)}
      disabled={isLastPage}
      class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:bg-brand-charcoal-gray/60 dark:border-brand-charcoal-gray/50 dark:text-gray-300 dark:hover:bg-brand-charcoal-gray/80 dark:focus:ring-brand-light-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      aria-label="Next page"
    >
      Next
    </button>
  </div>
</nav>
{/if}

<!-- Mobile page info (optional, shown below buttons) -->
<div class="sm:hidden text-center mt-2">
    {#if totalPages > 1}
        <p class="text-sm text-gray-700 dark:text-gray-300">
            Page <span class="font-medium">{currentPage}</span> of <span class="font-medium">{totalPages}</span>
        </p>
    {/if}
</div> 