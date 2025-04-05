<script lang="ts">
  import { user } from '../stores/authStore';
  import { supabase } from '../supabaseClient';
  import { createEventDispatcher } from 'svelte';

  export let snippetId: string | number;
  export let isLiked: boolean = false;
  export let likeCount: number = 0;
  
  const dispatch = createEventDispatcher();
  
  let isLoading = false;
  
  async function toggleLike() {
    if (!$user) return;
    
    isLoading = true;
    try {
      if (isLiked) {
        // Unlike the snippet
        const { error } = await supabase
          .from('snippet_likes')
          .delete()
          .match({ snippet_id: snippetId, user_id: $user.id });
          
        if (error) throw error;
        
        isLiked = false;
        likeCount = Math.max(0, likeCount - 1);
      } else {
        // Like the snippet
        const { error } = await supabase
          .from('snippet_likes')
          .insert({ snippet_id: snippetId, user_id: $user.id });
          
        if (error) throw error;
        
        isLiked = true;
        likeCount += 1;
      }
      
      // Emit event to notify parent component
      dispatch('update', { isLiked, count: likeCount });
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<button 
  on:click={toggleLike}
  disabled={isLoading || !$user}
  class="flex items-center text-gray-500 hover:text-brand-deep-blue dark:text-gray-400 dark:hover:text-brand-light-blue transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  aria-label={isLiked ? 'Unlike' : 'Like'}
>
  <!-- Heart icon - filled when liked, outline when not liked -->
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 {isLiked ? 'text-red-500 dark:text-red-400' : ''}" 
       fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
  
  <!-- Like count -->
  {#if likeCount > 0}
    <span class="ml-1 text-xs font-medium">{likeCount}</span>
  {/if}
  
  <!-- Loading indicator -->
  {#if isLoading}
    <div class="ml-1 h-3 w-3 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
  {/if}
</button> 