<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Expect activeQuickFilter prop for two-way binding
  export let activeQuickFilter: string = 'All Time';
  // startDate and endDate remain bound to App.svelte for manual range setting
  export let startDate: string | null = null;
  export let endDate: string | null = null;
  // Group filter prop
  export let selectedGroupName: string | null = null;
  export let availableGroups: string[] = [];
  
  // Debug logging for dropdown visibility issues
  $: console.log("FilterBar availableGroups length:", availableGroups?.length);
  $: console.log("Desktop dropdown should show:", availableGroups.length > 0);
  $: console.log("Current viewport classes: hidden md:flex vs md:hidden");
  
  // Flag to show/hide the manual date range inputs
  let showDateRangeInputs = activeQuickFilter === 'Custom Range';
  
  // Mobile dropdown menu state
  let isDropdownOpen = false;
  let isGroupDropdownOpen = false;

  const dispatch = createEventDispatcher();

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

  // Function to handle group selection
  function selectGroup(groupName: string | null) {
    selectedGroupName = groupName;
    isGroupDropdownOpen = false;
    handleFilter();
  }

  function handleFilter() {
    dispatch('filter');
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
      <div class="absolute z-30 mt-1 w-full bg-white dark:bg-brand-dark-brown border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-lg max-h-56 overflow-y-auto">
        {#each quickFilterOptions as option}
          <button
            type="button"
            class="block w-full text-left px-4 py-2 text-sm {activeQuickFilter === option ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray'}"
            on:click={() => selectFilter(option)}
          >
            {option}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Desktop Filter Tabs (visible on large screens and above) -->
  <div class="hidden lg:flex flex-shrink-0 items-center space-x-4">
    <!-- Date Filter Tabs -->
    <div class="flex space-x-1 bg-gray-100 dark:bg-brand-charcoal-gray/30 p-1 rounded-lg">
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

    <!-- Desktop Group Filter Dropdown -->
    {#if availableGroups.length > 0}
      <div class="relative">
        <button
          type="button"
          class="flex items-center justify-between w-48 px-3 py-1.5 bg-white dark:bg-brand-charcoal-gray/70 text-gray-800 dark:text-white border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest-green dark:focus:ring-brand-light-blue"
          on:click={() => isGroupDropdownOpen = !isGroupDropdownOpen}
        >
          <span class="truncate">{selectedGroupName || 'All Groups'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        {#if isGroupDropdownOpen}
          <div class="absolute z-30 mt-1 w-full bg-white dark:bg-brand-dark-brown border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <button
              type="button"
              class="block w-full text-left px-4 py-2 text-sm {selectedGroupName === null ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray'}"
              on:click={() => selectGroup(null)}
            >
              All Groups
            </button>
            {#each availableGroups as groupName}
              <button
                type="button"
                class="block w-full text-left px-4 py-2 text-sm {selectedGroupName === groupName ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray'}"
                on:click={() => selectGroup(groupName)}
              >
                {groupName}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Custom Date Range Inputs -->
  {#if activeQuickFilter === 'Custom Range'}
    <div class="flex flex-wrap gap-4 mt-4">
      <div class="flex-1 min-w-[200px]">
        <label for="start-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Start Date
        </label>
        <input
          type="date"
          id="start-date"
          bind:value={startDate}
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-forest-green focus:border-brand-forest-green dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue text-gray-700 bg-white dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white sm:text-sm"
          on:change={handleFilter}
        >
      </div>
      <div class="flex-1 min-w-[200px]">
        <label for="end-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          End Date
        </label>
        <input
          type="date"
          id="end-date"
          bind:value={endDate}
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-forest-green focus:border-brand-forest-green dark:focus:ring-brand-light-blue dark:focus:border-brand-light-blue text-gray-700 bg-white dark:bg-brand-charcoal-gray/40 dark:border-brand-charcoal-gray/50 dark:text-white sm:text-sm"
          on:change={handleFilter}
        >
      </div>
    </div>
  {/if}

  <!-- Mobile/Tablet Group Filter Dropdown -->
  {#if availableGroups.length > 0}
    <div class="w-full lg:hidden mt-4">
      <label for="group-filter-mobile" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Filter by Group
      </label>
      <div class="relative">
        <button 
          type="button" 
          class="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-brand-charcoal-gray/70 text-gray-800 dark:text-white border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-forest-green dark:focus:ring-brand-light-blue"
          on:click={() => isGroupDropdownOpen = !isGroupDropdownOpen}
        >
          <span class="truncate">{selectedGroupName || 'All Groups'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        
        {#if isGroupDropdownOpen}
          <div class="absolute z-30 mt-1 w-full bg-white dark:bg-brand-dark-brown border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <button
              type="button"
              class="block w-full text-left px-4 py-2 text-sm {selectedGroupName === null ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray'}"
              on:click={() => selectGroup(null)}
            >
              All Groups
            </button>
            {#each availableGroups as groupName}
              <button
                type="button"
                class="block w-full text-left px-4 py-2 text-sm {selectedGroupName === groupName ? 'bg-gray-100 dark:bg-brand-charcoal-gray text-brand-forest-green dark:text-brand-light-blue font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand-charcoal-gray'}"
                on:click={() => selectGroup(groupName)}
              >
                {groupName}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div> 