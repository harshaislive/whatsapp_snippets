<script lang="ts">
  import { supabase } from '../supabaseClient';
  import { onMount } from 'svelte';
  
  let email = '';
  let loading = false;
  let errorMessage = '';
  let successMessage = '';
  let isDarkMode = false;

  const ALLOWED_DOMAINS = ['beforest.co', 'bewild.life'];

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const isMobileRedirect = params.get('mobile') === 'true';
    const redirectUrl = params.get('redirect');
    
    if (isMobileRedirect && redirectUrl) {
      // Redirect to the actual application URL
      window.location.href = decodeURIComponent(redirectUrl);
    }

    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      
      isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
      updateTheme(isDarkMode);
    }
  });

  function updateTheme(dark: boolean) {
    if (typeof window !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  async function handleLogin() {
    try {
      loading = true;
      errorMessage = '';
      successMessage = '';
      
      // Validate email format and domain
      if (!email.trim()) {
        throw new Error('Please enter your email address');
      }

      if (!isValidEmail(email)) {
        throw new Error('Please use your @beforest.co or @bewild.life email address');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      successMessage = 'Check your email for the login link!';
      email = '';
    } catch (error: any) {
      errorMessage = error.message || 'An error occurred during login';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-brand-dark-earth py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div class="flex flex-col items-center">
      <!-- Logo container with both versions -->
      <div class="relative w-24 h-24 mb-2">
        <img
          src="/Beforest - Green.png"
          alt="Beforest Logo"
          class="absolute inset-0 w-full h-full object-contain dark:opacity-0 transition-opacity duration-200"
        />
        <img
          src="/Beforest - White.png"
          alt="Beforest Logo"
          class="absolute inset-0 w-full h-full object-contain opacity-0 dark:opacity-100 transition-opacity duration-200"
        />
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
        Sign in to Snippets
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-100">
        Enter your email to receive a magic link
      </p>
    </div>

    <form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="email-address" class="sr-only">Email address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-forest-green focus:border-brand-forest-green focus:z-10 sm:text-sm dark:bg-brand-charcoal-gray dark:border-brand-charcoal-gray/50 dark:text-white dark:placeholder-gray-400"
            placeholder="Email address"
          />
        </div>
      </div>

      {#if errorMessage}
        <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
                {errorMessage}
              </h3>
            </div>
          </div>
        </div>
      {/if}

      {#if successMessage}
        <div class="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-300">
                {successMessage}
              </h3>
            </div>
          </div>
        </div>
      {/if}

      <div>
        <button
          type="submit"
          disabled={loading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-forest-green hover:bg-brand-forest-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-forest-green dark:bg-brand-forest-green dark:hover:bg-brand-forest-green/90 dark:focus:ring-brand-light-blue dark:ring-offset-brand-dark-earth dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {#if loading}
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Sending magic link...
          {:else}
            Sign in
          {/if}
        </button>
      </div>
    </form>
  </div>
</div> 