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

  // Declare media type variables
  let isMediaUrl = false;
  let isImageUrl = false;
  let isVideoUrl = false;
  let isAudioUrl = false;

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Enhanced media type detection
  $: {
    const content = snippet.content || '';
    const messageType = snippet.message_type?.toLowerCase() || '';
    const isUrl = typeof content === 'string' && isValidUrl(content);
    
    // Determine media type using both message_type and URL analysis
    isMediaUrl = isUrl;
    isImageUrl = (messageType.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(content)) && isUrl;
    isVideoUrl = (messageType.includes('video') || /\.(mp4|webm|ogg|mov)$/i.test(content)) && isUrl;
    isAudioUrl = (messageType.includes('audio') || /\.(mp3|wav|ogg|m4a)$/i.test(content)) && isUrl;
    
    // Log for debugging
    console.log('[SnippetCard] Processing snippet:', {
      id: snippet.id,
      content: content,
      message_type: messageType,
      isUrl,
      isImageUrl,
      isVideoUrl,
      isAudioUrl
    });
  }
  
  // Determine message type for display
  $: messageType = snippet.message_type?.toLowerCase() || 
                   (isImageUrl ? 'image' : 
                    isVideoUrl ? 'video' : 
                    isAudioUrl ? 'audio' :
                    isMediaUrl ? 'media' : 'text');

  // Message content preview text
  $: contentPreview = messageType === 'text' ? 
                      (snippet.content?.length > 100 ? snippet.content.substring(0, 100) + '...' : snippet.content) : 
                      `${messageType.charAt(0).toUpperCase() + messageType.slice(1)} message`;

  // Function to get media URL (handles both direct URLs and potential object structures)
  function getMediaUrl(content: any): string {
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content !== null) {
      // Check common media URL fields
      return content.url || content.mediaUrl || content.media_url || content.link || '';
    }
    return '';
  }

  // Function to handle media load errors
  function handleMediaError(event: Event) {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md';
    errorDiv.textContent = 'Media failed to load. Click the link below to open in a new tab.';
    target.parentElement?.appendChild(errorDiv);
  }
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
              src={getMediaUrl(snippet.content)} 
              alt={snippet.caption || 'Image'} 
              class="w-full h-auto object-cover transform hover:scale-[1.01] transition-transform duration-300" 
              loading="lazy"
              on:error={handleMediaError}
            >
          </div>
          {#if snippet.caption}
            <p class="text-xs italic mt-1 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
          {/if}
          <!-- Always show link for direct access -->
          <div class="mt-2">
            <a href={getMediaUrl(snippet.content)} target="_blank" rel="noopener noreferrer" 
               class="text-xs text-brand-deep-blue hover:text-brand-coral-orange dark:text-brand-light-blue dark:hover:text-white transition-colors duration-200 inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open image in new tab
            </a>
          </div>
        {:else if isVideoUrl}
          <div class="media-wrapper mb-2 overflow-hidden shadow-apple-sm hover:shadow-md transition-shadow duration-300 rounded-md">
            <video 
              controls 
              src={getMediaUrl(snippet.content)} 
              class="w-full max-h-[300px]"
              on:error={handleMediaError}
            >
              Your browser doesn't support video playback.
            </video>
          </div>
          {#if snippet.caption}
            <p class="text-xs italic mt-1 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
          {/if}
          <!-- Always show link for direct access -->
          <div class="mt-2">
            <a href={getMediaUrl(snippet.content)} target="_blank" rel="noopener noreferrer" 
               class="text-xs text-brand-deep-blue hover:text-brand-coral-orange dark:text-brand-light-blue dark:hover:text-white transition-colors duration-200 inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open video in new tab
            </a>
          </div>
        {:else if isAudioUrl}
          <div class="media-wrapper mb-2 p-3 bg-brand-off-white dark:bg-brand-charcoal-gray/60 rounded-md overflow-hidden">
            <audio 
              controls 
              src={getMediaUrl(snippet.content)} 
              class="w-full"
              on:error={handleMediaError}
            >
              Your browser doesn't support audio playback.
            </audio>
            {#if snippet.caption}
              <p class="text-xs italic mt-2 text-brand-charcoal-gray dark:text-gray-400">{snippet.caption}</p>
            {/if}
          </div>
          <!-- Always show link for direct access -->
          <div class="mt-2">
            <a href={getMediaUrl(snippet.content)} target="_blank" rel="noopener noreferrer" 
               class="text-xs text-brand-deep-blue hover:text-brand-coral-orange dark:text-brand-light-blue dark:hover:text-white transition-colors duration-200 inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open audio in new tab
            </a>
          </div>
        {:else if isMediaUrl}
          <div class="media-wrapper mb-2 p-3 bg-brand-off-white dark:bg-brand-charcoal-gray/60 rounded-md overflow-hidden">
            <div class="flex items-center justify-between">
              <div class="flex items-center flex-1 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-brand-coral-orange dark:text-brand-light-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="truncate">{snippet.caption || 'Media attachment'}</span>
              </div>
              <a href={getMediaUrl(snippet.content)} target="_blank" rel="noopener noreferrer" 
                 class="ml-2 text-brand-deep-blue hover:text-brand-coral-orange dark:text-brand-light-blue dark:hover:text-white transition-colors duration-200 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        {:else}
          <!-- Text message -->
          <p class="whitespace-pre-wrap break-words">{snippet.content}</p>
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