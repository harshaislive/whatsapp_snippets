<!-- BlockedJids.svelte -->
<script lang="ts">
  import { supabase } from '../supabaseClient';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  // Types
  interface BlockedJid {
    id: string;
    jid: string;
    reason: string;
    created_at: string;
  }

  // State
  let blockedJids: BlockedJid[] = [];
  let loading = true;
  let error: string | null = null;
  let newJid = '';
  let newReason = '';
  let showSuccessMessage = false;
  let successMessage = '';

  // Fetch blocked JIDs
  async function fetchBlockedJids() {
    try {
      loading = true;
      const { data, error: fetchError } = await supabase
        .from('blocked_jids')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      blockedJids = data || [];
    } catch (e: any) {
      error = e.message;
      console.error('Error fetching blocked JIDs:', e);
    } finally {
      loading = false;
    }
  }

  // Add new blocked JID
  async function addBlockedJid() {
    if (!newJid.trim()) {
      error = 'Please enter a JID';
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('blocked_jids')
        .insert([
          {
            jid: newJid.trim(),
            reason: newReason.trim() || null
          }
        ]);

      if (insertError) throw insertError;

      // Clear form and show success message
      newJid = '';
      newReason = '';
      showSuccessMessage = true;
      successMessage = 'JID blocked successfully';
      setTimeout(() => showSuccessMessage = false, 3000);

      // Refresh the list
      await fetchBlockedJids();
    } catch (e: any) {
      error = e.message;
      console.error('Error adding blocked JID:', e);
    }
  }

  // Remove blocked JID
  async function removeBlockedJid(id: string) {
    try {
      const { error: deleteError } = await supabase
        .from('blocked_jids')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      showSuccessMessage = true;
      successMessage = 'JID unblocked successfully';
      setTimeout(() => showSuccessMessage = false, 3000);

      // Refresh the list
      await fetchBlockedJids();
    } catch (e: any) {
      error = e.message;
      console.error('Error removing blocked JID:', e);
    }
  }

  onMount(() => {
    fetchBlockedJids();
  });
</script>

<div class="blocked-jids-container">
  <h2>Manage Blocked JIDs</h2>

  <!-- Add new blocked JID form -->
  <div class="add-jid-form">
    <input
      type="text"
      bind:value={newJid}
      placeholder="Enter JID to block"
      class="input"
    />
    <input
      type="text"
      bind:value={newReason}
      placeholder="Reason (optional)"
      class="input"
    />
    <button on:click={addBlockedJid} class="btn">Block JID</button>
  </div>

  {#if error}
    <div class="error-message" transition:fade>
      {error}
    </div>
  {/if}

  {#if showSuccessMessage}
    <div class="success-message" transition:fade>
      {successMessage}
    </div>
  {/if}

  <!-- List of blocked JIDs -->
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if blockedJids.length === 0}
    <div class="no-data">No blocked JIDs</div>
  {:else}
    <div class="blocked-jids-list">
      {#each blockedJids as { id, jid, reason, created_at }}
        <div class="blocked-jid-item">
          <div class="jid-info">
            <strong>{jid}</strong>
            {#if reason}
              <span class="reason">{reason}</span>
            {/if}
            <span class="date">Blocked on: {new Date(created_at).toLocaleDateString()}</span>
          </div>
          <button
            on:click={() => removeBlockedJid(id)}
            class="btn-remove"
          >
            Unblock
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .blocked-jids-container {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  h2 {
    margin-bottom: 1.5rem;
    color: var(--text-color);
  }

  .add-jid-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .input {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    flex: 1;
    min-width: 200px;
    background: var(--input-bg);
    color: var(--text-color);
  }

  .btn {
    padding: 0.5rem 1rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:hover {
    background-color: var(--primary-color-hover);
  }

  .blocked-jids-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .blocked-jid-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }

  .jid-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .reason {
    font-size: 0.9em;
    color: var(--text-muted);
  }

  .date {
    font-size: 0.8em;
    color: var(--text-muted);
  }

  .btn-remove {
    padding: 0.25rem 0.75rem;
    background-color: var(--danger-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-remove:hover {
    background-color: var(--danger-color-hover);
  }

  .error-message {
    padding: 0.75rem;
    background-color: var(--danger-color);
    color: white;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .success-message {
    padding: 0.75rem;
    background-color: var(--success-color);
    color: white;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .loading, .no-data {
    text-align: center;
    padding: 1rem;
    color: var(--text-muted);
  }

  @media (max-width: 600px) {
    .add-jid-form {
      flex-direction: column;
    }

    .blocked-jid-item {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }

    .btn-remove {
      width: 100%;
    }
  }
</style> 