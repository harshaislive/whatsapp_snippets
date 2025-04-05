-- Define the tables for social features

-- 1. Snippet Likes Table
-- Stores user likes on snippets with unique constraint to prevent duplicates
CREATE TABLE IF NOT EXISTS public.snippet_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snippet_id UUID NOT NULL REFERENCES public.whatsapp_snippets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(snippet_id, user_id)
);

-- 2. Snippet Comments Table
-- Stores user comments on snippets with edit tracking
CREATE TABLE IF NOT EXISTS public.snippet_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snippet_id UUID NOT NULL REFERENCES public.whatsapp_snippets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_edited BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Snippet Shares Table
-- Tracks sharing analytics
CREATE TABLE IF NOT EXISTS public.snippet_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snippet_id UUID NOT NULL REFERENCES public.whatsapp_snippets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security Policies

-- Likes policies
ALTER TABLE public.snippet_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view likes" ON public.snippet_likes
  FOR SELECT USING (true);

-- Users can like snippets
CREATE POLICY "Users can like snippets" ON public.snippet_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike their own likes" ON public.snippet_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comment policies
ALTER TABLE public.snippet_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments" ON public.snippet_comments
  FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments" ON public.snippet_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.snippet_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.snippet_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Shares policies (more permissive as it's for analytics)
ALTER TABLE public.snippet_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can view shares
CREATE POLICY "Anyone can view shares" ON public.snippet_shares
  FOR SELECT USING (true);

-- Anyone can record a share
CREATE POLICY "Anyone can record a share" ON public.snippet_shares
  FOR INSERT WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_snippet_likes_snippet_id ON public.snippet_likes(snippet_id);
CREATE INDEX IF NOT EXISTS idx_snippet_likes_user_id ON public.snippet_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_snippet_comments_snippet_id ON public.snippet_comments(snippet_id);
CREATE INDEX IF NOT EXISTS idx_snippet_comments_user_id ON public.snippet_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_snippet_shares_snippet_id ON public.snippet_shares(snippet_id);

-- Enable Realtime for the tables to support realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.snippet_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.snippet_comments; 