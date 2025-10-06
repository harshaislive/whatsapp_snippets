# WhatsApp Snippets - Next.js with shadcn/ui

A modern, fully-functional WhatsApp snippets viewer built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

✅ **Working Date Filters** - All Time, Today, Yesterday, Last 7 Days, Last 30 Days, Custom Range
✅ **Working Group Dropdown** - Visible on both desktop and mobile
✅ **Real-time Updates** - Live updates via Supabase realtime
✅ **Responsive Design** - Mobile-first, works on all screen sizes
✅ **Beautiful UI** - Built with shadcn/ui components
✅ **Proper State Management** - React hooks with proper dependencies
✅ **TypeScript** - Full type safety

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
whatsapp-snippets-next/
├── app/
│   ├── page.tsx              # Main page with filters and snippets list
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles with Tailwind
├── components/
│   ├── FilterBar.tsx         # Filter component with date and group filters
│   ├── SnippetCard.tsx       # Individual snippet card component
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase.ts           # Supabase client and types
│   └── utils.ts              # Utility functions
└── .env.local                # Environment variables
```

## Database Schema

The app expects a Supabase table named `whatsapp_snippets` with the following structure:

```sql
create table whatsapp_snippets (
  id bigint primary key generated always as identity,
  timestamp timestamptz not null,
  sender_name text,
  sender_jid text,
  content text not null,
  caption text,
  message_type text,
  group_name text,
  is_group boolean default false
);

-- Enable Row Level Security
alter table whatsapp_snippets enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
  on whatsapp_snippets for select
  to public
  using (true);

-- Enable realtime
alter publication supabase_realtime add table whatsapp_snippets;
```

## How It Works

### Filters
- **Quick Filters**: Buttons for common date ranges (All Time, Today, Yesterday, etc.)
- **Custom Range**: Date pickers for start and end dates
- **Group Filter**: Dropdown to filter by WhatsApp group

### Real-time Updates
- Automatically subscribes to new snippets via Supabase realtime
- New snippets appear at the top if they match current filters
- No manual refresh needed

### Date Grouping
- Snippets are automatically grouped by date
- Dates are sorted in descending order (newest first)
- Clean, organized layout

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **Supabase** - Backend, database, and realtime
- **date-fns** - Date formatting and manipulation
- **Lucide React** - Icon library

## Differences from Svelte Version

This Next.js version fixes all the issues present in the Svelte version:

1. ✅ Filters work properly with React's `useCallback` and dependency arrays
2. ✅ Desktop group dropdown is visible and functional
3. ✅ Date filters apply correctly with proper date handling
4. ✅ No reactive statement issues - uses React hooks properly
5. ✅ Clean, maintainable code with TypeScript
6. ✅ Better UI with shadcn/ui components

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
