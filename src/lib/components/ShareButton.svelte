<script lang="ts">
  import { supabase } from '../supabaseClient';
  import { fade } from 'svelte/transition';
  
  export let snippetId: string | number;
  export let snippetContent: string;
  
  let shareOpen = false;
  let shareSuccess = false;
  let errorMessage = '';
  
  // Close share options after a delay
  function handleShareSuccess() {
    shareSuccess = true;
    setTimeout(() => {
      shareSuccess = false;
      shareOpen = false;
    }, 2000);
  }
  
  // Share via clipboard (copy link)
  async function copyToClipboard() {
    try {
      // Construct shareable URL with snippet ID
      const shareUrl = `${window.location.origin}/snippet/${snippetId}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      // Track share event in Supabase (optional)
      await recordShareEvent('clipboard');
      
      handleShareSuccess();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      errorMessage = 'Failed to copy link';
      setTimeout(() => errorMessage = '', 3000);
    }
  }
  
  // Share via native share API (mobile)
  async function shareNative() {
    if (!navigator.share) {
      copyToClipboard();
      return;
    }
    
    try {
      // Construct shareable URL with snippet ID
      const shareUrl = `${window.location.origin}/snippet/${snippetId}`;
      
      await navigator.share({
        title: 'WhatsApp Snippet',
        text: snippetContent.substring(0, 100) + (snippetContent.length > 100 ? '...' : ''),
        url: shareUrl
      });
      
      // Track share event in Supabase (optional)
      await recordShareEvent('native');
      
      handleShareSuccess();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        errorMessage = 'Failed to share';
        setTimeout(() => errorMessage = '', 3000);
      }
    }
  }
  
  // Record share event in Supabase (analytics)
  async function recordShareEvent(method: string) {
    try {
      await supabase
        .from('snippet_shares')
        .insert({
          snippet_id: snippetId,
          share_method: method
        });
    } catch (error) {
      // Don't display errors for analytics
      console.error('Error recording share event:', error);
    }
  }
  
  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (shareOpen && !event.target.closest('.share-dropdown')) {
      shareOpen = false;
    }
  }
  
  // Add click outside listener
  import { onMount, onDestroy } from 'svelte';
  
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });
  
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div class="relative share-dropdown">
  <!-- Share button -->
  <button 
    on:click={() => shareOpen = !shareOpen}
    class="flex items-center text-gray-500 hover:text-brand-deep-blue dark:text-gray-400 dark:hover:text-brand-light-blue transition-colors duration-200"
    aria-label="Share"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  </button>
  
  <!-- Share dropdown menu -->
  {#if shareOpen}
    <div 
      transition:fade={{ duration: 100 }}
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-brand-dark-brown rounded-md shadow-lg z-10 border border-gray-100 dark:border-brand-charcoal-gray/30"
    >
      {#if shareSuccess}
        <div class="p-3 text-center text-sm text-green-600 dark:text-green-400">
          Link copied!
        </div>
      {:else if errorMessage}
        <div class="p-3 text-center text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </div>
      {:else}
        <div class="py-1">
          <button
            on:click={copyToClipboard}
            class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-charcoal-gray/50"
          >
            Copy link
          </button>
          
          {#if navigator.share}
            <button
              on:click={shareNative}
              class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-charcoal-gray/50"
            >
              Share via...
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div> 