<script lang="ts">
  // Expect activeQuickFilter prop for two-way binding
  export let activeQuickFilter = 'All Time';
  // startDate and endDate remain bound to App.svelte for manual range setting
  export let startDate: string | null = null;
  export let endDate: string | null = null;
  
  // Flag to show/hide the manual date range inputs
  let showDateRangeInputs = activeQuickFilter === 'Custom Range';
  
  // Mobile dropdown menu state
  let isDropdownOpen = false;

  const quickFilterOptions = ['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom Range'];

  // Function to format date for display
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Any date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  
  // Update showDateRangeInputs when activeQuickFilter changes
  $: showDateRangeInputs = activeQuickFilter === 'Custom Range';
  
  // When manual dates are changed, switch to Custom Range filter
  function handleDateInputChange() {
    if (startDate || endDate) {
      activeQuickFilter = 'Custom Range';
    }
  }
  
  // Function to handle filter selection
  function selectFilter(option: string) {
    activeQuickFilter = option;
    isDropdownOpen = false;
  }
</script>

<div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
  <!-- Mobile Dropdown (visible on small screens) -->
  <div class="relative w-full md:hidden">
    <button 
      type="button" 
      class="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-brand-charcoal-gray/70 text-gray-800 dark:text-white border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-forest-green dark:focus:ring-brand-light-blue"
      on:click={() => isDropdownOpen = !isDropdownOpen}
    >
      <span>{activeQuickFilter}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>
    
    {#if isDropdownOpen}
      <div class="absolute z-10 mt-1 w-full bg-white dark:bg-brand-charcoal-gray/80 border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-lg max-h-56 overflow-y-auto">
        {#each quickFilterOptions as option}
          <button
            type="button"
            class="block w-full text-left px-4 py-2 text-sm {activeQuickFilter === option ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray/60'}"
            on:click={() => selectFilter(option)}
          >
            {option}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Desktop Filter Tabs (visible on medium screens and above) -->
  <div class="hidden md:flex flex-shrink-0 space-x-1 bg-gray-100 dark:bg-brand-charcoal-gray/30 p-1 rounded-lg">
    {#each quickFilterOptions as option}
      <button
        type="button"
        class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out {activeQuickFilter === option ? 'bg-white dark:bg-brand-charcoal-gray/70 text-gray-800 dark:text-white shadow-sm dark:shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}"
        on:click={() => activeQuickFilter = option}
      >
        {option}
      </button>
    {/each}
  </div>

  <!-- Manual Date Range Inputs (Conditional) -->
  {#if showDateRangeInputs}
    <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto mt-2 md:mt-0">
      <div class="w-full sm:w-auto">
        <label for="start-date" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
        <input
          type="date"
          id="start-date"
          bind:value={startDate}
          on:input={handleDateInputChange}
          class="block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-forest-green focus:border-brand-forest-green dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue"
        />
      </div>
      <div class="w-full sm:w-auto">
        <label for="end-date" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
        <input
          type="date"
          id="end-date"
          bind:value={endDate}
          on:input={handleDateInputChange}
          class="block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-forest-green focus:border-brand-forest-green dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue"
        />
      </div>
    </div>
  {:else}
    <div class="h-10 md:h-0"></div>
  {/if}
</div> 