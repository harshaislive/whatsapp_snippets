<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { user } from '../stores/authStore';
  import { supabase } from '../supabaseClient';
  import { fade } from 'svelte/transition';

  export let snippetId: string | number;
  export let commentCount: number = 0;
  export let expanded: boolean = false;

  let comments: any[] = [];
  let newComment: string = '';
  let isLoading: boolean = false;
  let isSubmitting: boolean = false;
  let editingCommentId: string | null = null;
  let editText: string = '';

  const dispatch = createEventDispatcher();

  // Fetch comments when the component is expanded
  $: if (expanded) {
    fetchComments();
  }

  // Function to format the timestamp
  function formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting date:", timestamp, e);
      return '';
    }
  }

  // Fetch comments from Supabase
  async function fetchComments() {
    if (isLoading) return;
    
    isLoading = true;
    try {
      const { data, error } = await supabase
        .from('snippet_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          is_edited,
          user_id,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('snippet_id', snippetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      comments = data || [];
      commentCount = comments.length;
      dispatch('update', { count: commentCount });
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      isLoading = false;
    }
  }

  // Add a new comment
  async function addComment() {
    if (!$user || !newComment.trim() || isSubmitting) return;
    
    isSubmitting = true;
    try {
      const { data, error } = await supabase
        .from('snippet_comments')
        .insert({
          snippet_id: snippetId,
          user_id: $user.id,
          content: newComment.trim()
        })
        .select(`
          id,
          content,
          created_at,
          updated_at,
          is_edited,
          user_id,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `);

      if (error) throw error;
      
      if (data && data.length > 0) {
        comments = [...comments, data[0]];
        commentCount += 1;
        dispatch('update', { count: commentCount });
        newComment = '';
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      isSubmitting = false;
    }
  }

  // Edit an existing comment
  async function updateComment(commentId: string) {
    if (!$user || !editText.trim() || isSubmitting) return;
    
    isSubmitting = true;
    try {
      const { data, error } = await supabase
        .from('snippet_comments')
        .update({
          content: editText.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId)
        .eq('user_id', $user.id) // Ensure the user can only edit their own comments
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        comments = comments.map(comment => 
          comment.id === commentId ? { ...comment, content: editText.trim(), updated_at: new Date().toISOString(), is_edited: true } : comment
        );
        editingCommentId = null;
        editText = '';
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      isSubmitting = false;
    }
  }

  // Delete a comment
  async function deleteComment(commentId: string) {
    if (!$user || isSubmitting) return;
    
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    isSubmitting = true;
    try {
      const { error } = await supabase
        .from('snippet_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', $user.id); // Ensure the user can only delete their own comments

      if (error) throw error;
      
      comments = comments.filter(comment => comment.id !== commentId);
      commentCount = Math.max(0, commentCount - 1);
      dispatch('update', { count: commentCount });
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      isSubmitting = false;
    }
  }

  // Start editing a comment
  function startEdit(comment: any) {
    editingCommentId = comment.id;
    editText = comment.content;
  }

  // Cancel editing
  function cancelEdit() {
    editingCommentId = null;
    editText = '';
  }

  // Setup Supabase realtime subscription for comments on this snippet
  let subscription: any;

  onMount(() => {
    // Set up realtime subscription for new comments
    subscription = supabase
      .channel(`comments_${snippetId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'snippet_comments',
        filter: `snippet_id=eq.${snippetId}`
      }, payload => {
        // Handle different events
        if (payload.eventType === 'INSERT' && payload.new.user_id !== $user?.id) {
          // New comment from another user
          fetchComments(); // Refresh all comments to get the user profile
        }
        else if (payload.eventType === 'UPDATE' && payload.new.user_id !== $user?.id) {
          // Comment updated by another user
          fetchComments();
        }
        else if (payload.eventType === 'DELETE') {
          // Comment deleted
          const deletedId = payload.old.id;
          if (comments.some(c => c.id === deletedId)) {
            comments = comments.filter(c => c.id !== deletedId);
            commentCount = Math.max(0, commentCount - 1);
            dispatch('update', { count: commentCount });
          }
        }
      })
      .subscribe();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  });
</script>

<!-- Comment section toggle button -->
<button 
  on:click={() => expanded = !expanded}
  class="flex items-center text-gray-500 hover:text-brand-deep-blue dark:text-gray-400 dark:hover:text-brand-light-blue transition-colors duration-200"
  aria-expanded={expanded}
  aria-controls="comment-section"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
  
  {#if commentCount > 0}
    <span class="ml-1 text-xs font-medium">{commentCount}</span>
  {/if}
</button>

<!-- Expanded comment section -->
{#if expanded}
  <div id="comment-section" transition:fade={{ duration: 150 }} class="mt-3 pt-3 border-t border-gray-100 dark:border-brand-charcoal-gray/30">
    <!-- Comments list -->
    <div class="space-y-3 mb-3">
      {#if isLoading && comments.length === 0}
        <div class="flex justify-center py-3">
          <div class="h-5 w-5 border-2 border-t-transparent border-brand-deep-blue dark:border-brand-light-blue rounded-full animate-spin"></div>
        </div>
      {:else if comments.length === 0}
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No comments yet. Be the first to comment!</p>
      {:else}
        {#each comments as comment (comment.id)}
          <div class="flex space-x-2">
            <!-- Comment avatar or initial -->
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-brand-light-blue/20 dark:bg-brand-charcoal-gray/60 flex items-center justify-center text-xs font-medium text-brand-deep-blue dark:text-brand-light-blue">
              {#if comment.profiles?.avatar_url}
                <img src={comment.profiles.avatar_url} alt="Avatar" class="w-full h-full rounded-full object-cover" />
              {:else}
                {(comment.profiles?.display_name || 'User').charAt(0).toUpperCase()}
              {/if}
            </div>
            
            <!-- Comment content -->
            <div class="flex-1">
              {#if editingCommentId === comment.id}
                <!-- Edit mode -->
                <div class="space-y-2">
                  <textarea 
                    bind:value={editText}
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md bg-white dark:bg-brand-charcoal-gray/40 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-deep-blue dark:focus:ring-brand-light-blue"
                    rows="2"
                    placeholder="Edit your comment..."
                  ></textarea>
                  
                  <div class="flex space-x-2">
                    <button 
                      on:click={() => updateComment(comment.id)}
                      disabled={isSubmitting}
                      class="px-3 py-1 text-xs font-medium text-white bg-brand-deep-blue dark:bg-brand-light-blue rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                    
                    <button 
                      on:click={cancelEdit}
                      class="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-brand-charcoal-gray/60 rounded-md hover:opacity-90 transition-opacity"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              {:else}
                <!-- View mode -->
                <div>
                  <div class="flex items-baseline justify-between">
                    <div class="text-xs font-medium dark:text-white">
                      {comment.profiles?.display_name || 'User'}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(comment.created_at)}
                      {#if comment.is_edited}
                        <span class="text-xs italic ml-1">(edited)</span>
                      {/if}
                    </div>
                  </div>
                  
                  <p class="text-sm mt-1 text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                  
                  <!-- Comment actions for the comment author -->
                  {#if $user && $user.id === comment.user_id}
                    <div class="flex mt-1 space-x-3">
                      <button 
                        on:click={() => startEdit(comment)}
                        class="text-xs text-gray-500 hover:text-brand-deep-blue dark:text-gray-400 dark:hover:text-brand-light-blue"
                      >
                        Edit
                      </button>
                      <button 
                        on:click={() => deleteComment(comment.id)}
                        class="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
    
    <!-- New comment form -->
    {#if $user}
      <form on:submit|preventDefault={addComment} class="flex space-x-2">
        <textarea 
          bind:value={newComment}
          class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-brand-charcoal-gray/50 rounded-md bg-white dark:bg-brand-charcoal-gray/40 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-deep-blue dark:focus:ring-brand-light-blue"
          rows="1"
          placeholder="Add a comment..."
        ></textarea>
        
        <button 
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          class="px-4 py-2 text-sm font-medium text-white bg-brand-deep-blue dark:bg-brand-light-blue rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 
            <span class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Posting
            </span> : 
            'Post'
          }
        </button>
      </form>
    {:else}
      <div class="text-sm text-center text-gray-500 dark:text-gray-400 py-2">
        Please log in to comment.
      </div>
    {/if}
  </div>
{/if} 