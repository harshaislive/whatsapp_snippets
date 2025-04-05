<script lang="ts">
  // Placeholder for SnippetCard component
  // Will receive a single 'snippet' object as a prop
  export let snippet: any; // Replace 'any' with a proper type later

  // Function to format timestamp
  function formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'Unknown time';
    try {
      const date = new Date(timestamp);
      
      // Format for today's messages (just time)
      const today = new Date();
      const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear();
      
      if (isToday) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
      
      // Format for this week (day + time)
      const dayDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' + 
               date.toLocaleTimeString('en-US', { 
                 hour: 'numeric', 
                 minute: '2-digit',
                 hour12: true 
               });
      }
      
      // Default format (full date)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting date:", timestamp, e);
      return 'Invalid date';
    }
  }

  // Helper to get sender display name
  $: senderDisplayName = snippet.sender_name || snippet.sender_jid?.split('@')[0] || 'Unknown Sender';
  
  // --- DEBUGGING --- 
  $: console.log('[SnippetCard] Received snippet:', JSON.parse(JSON.stringify(snippet))); // Log full snippet data
  
  // Add initial for avatar
  $: senderInitial = senderDisplayName.charAt(0).toUpperCase();

  // Helper to determine if content is a media URL
  $: isMediaUrl = typeof snippet.content === 'string' && (snippet.content.startsWith('http') || snippet.content.startsWith('blob:'));
  $: isImageUrl = isMediaUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(snippet.content);
  $: isVideoUrl = isMediaUrl && /\.(mp4|webm|ogg|mov)$/i.test(snippet.content);
  $: isAudioUrl = isMediaUrl && /\.(mp3|wav|ogg|m4a)$/i.test(snippet.content);
  
  // Determine message type for display
  $: messageType = isImageUrl ? 'image' : 
                   isVideoUrl ? 'video' : 
                   isAudioUrl ? 'audio' :
                   isMediaUrl ? 'media' : 'text';
                   
  // --- DEBUGGING --- 
  $: console.log(`[SnippetCard] Content: ${snippet.content}, isImageUrl: ${isImageUrl}, isVideoUrl: ${isVideoUrl}, isAudioUrl: ${isAudioUrl}, isMediaUrl: ${isMediaUrl}, messageType: ${messageType}`);
  
  // Message content preview text
  $: contentPreview = messageType === 'text' ? 
                      (snippet.content?.length > 100 ? snippet.content.substring(0, 100) + '...' : snippet.content) : 
                      `${messageType.charAt(0).toUpperCase() + messageType.slice(1)} message`;
</script>

<div class="card mb-4 animate-fade-in hover:translate-y-[-1px] transition-transform duration-200 bg-white dark:bg-brand-charcoal-gray/40 p-4 rounded-lg shadow-sm dark:shadow-md border border-gray-100 dark:border-brand-charcoal-gray/30">
  <div class="flex items-start">
    <!-- Avatar Circle -->
    <div class="flex-shrink-0 flex justify-center items-center w-10 h-10 rounded-full mr-3 bg-brand-deep-blue dark:bg-brand-light-blue text-white font-medium">
      {senderInitial}
    </div>
    
    <div class="flex-1 min-w-0">
      <!-- Header -->
      <div class="flex items-baseline justify-between mb-2">
        <div>
          <h3 class="text-sm font-medium text-brand-dark-earth dark:text-white truncate">
            {senderDisplayName}
          </h3>
          {#if snippet.is_group && snippet.group_name}
            <p class="text-xs text-brand-charcoal-gray dark:text-gray-400 mt-0.5">
              <span class="inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {snippet.group_name}
              </span>
            </p>
          {/if}
        </div>
        <time datetime={snippet.timestamp} class="text-xs text-brand-charcoal-gray/80 dark:text-gray-400">
          {formatTimestamp(snippet.timestamp)}
        </time>
      </div>
      
      <!-- Content -->
      <div class="text-brand-dark-earth dark:text-gray-200 text-sm leading-relaxed">
        {#if isImageUrl}
          <div class="media-wrapper mb-2 overflow-hidden max-h-[300px] shadow-apple-sm hover:shadow-md transition-shadow duration-300 rounded-md">
            <img 
              src={snippet.content} 
              alt={snippet.caption || 'Image'} 
              class="w-full h-auto object-cover transform hover:scale-[1.01] transition-transform duration-300" 
              loading="lazy"
            >
          </div>
          {#if snippet.caption}
            <p class="text-xs italic mt-1 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
          {/if}
        {:else if isVideoUrl}
          <div class="media-wrapper mb-2 overflow-hidden shadow-apple-sm hover:shadow-md transition-shadow duration-300 rounded-md">
            <video 
              controls 
              src={snippet.content} 
              class="w-full max-h-[300px]"
            >
              Your browser doesn't support video playback.
            </video>
          </div>
          {#if snippet.caption}
            <p class="text-xs italic mt-1 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
          {/if}
        {:else if isAudioUrl}
          <div class="media-wrapper mb-2 p-3 bg-brand-off-white dark:bg-brand-charcoal-gray/60 rounded-md overflow-hidden">
            <audio controls src={snippet.content} class="w-full">
              Your browser doesn't support audio playback.
            </audio>
            {#if snippet.caption}
              <p class="text-xs italic mt-2 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
            {/if}
          </div>
        {:else if isMediaUrl}
          <div class="media-wrapper mb-2 p-3 bg-brand-off-white dark:bg-brand-charcoal-gray/60 rounded-md overflow-hidden flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-brand-coral-orange dark:text-brand-light-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <a href={snippet.content} target="_blank" rel="noopener noreferrer" class="text-brand-deep-blue hover:text-brand-coral-orange dark:text-brand-light-blue dark:hover:text-white transition-colors duration-200">
              {snippet.caption || 'View Attachment'}
            </a>
          </div>
        {:else}
          <!-- Text message -->
          <p class="whitespace-pre-wrap">{snippet.content}</p>
          {#if snippet.caption}
            <p class="text-xs italic mt-2 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
          {/if}
        {/if}
      </div>
      
      <!-- Footer / Message Type Indicator -->
      <div class="flex items-center mt-3 text-xs text-brand-charcoal-gray/70 dark:text-gray-400">
        <span class="inline-flex items-center">
          {#if messageType === 'text'}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Text Message
          {:else if messageType === 'image'}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image
          {:else if messageType === 'video'}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video
          {:else if messageType === 'audio'}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Audio
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Attachment
          {/if}
        </span>
      </div>
    </div>
  </div>
</div> 