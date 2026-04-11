-- Supabase Database Schema for BrewSpot

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  profile TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Cafes Table
CREATE TABLE public.cafes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rating NUMERIC(3, 1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  price_level TEXT,
  type TEXT,
  address TEXT,
  status TEXT,
  tags TEXT[] DEFAULT '{}',
  hero_image TEXT,
  inspiration_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Posts Table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  location TEXT,
  rating NUMERIC(3, 1),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Post Likes Table (Many-to-Many relationship between Users and Posts)
CREATE TABLE public.post_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- 5. Post Saves Table
CREATE TABLE public.post_saves (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- 6. Cafe Saves Table
CREATE TABLE public.cafe_saves (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, cafe_id)
);

-- 7. Comments Table (Optional, added to support 'comments' count on Posts)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create views to easily get aggregate data (likes, saves, comments)

CREATE OR REPLACE VIEW public.post_stats AS
SELECT 
  p.id as post_id,
  (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id) as likes_count,
  (SELECT COUNT(*) FROM public.post_saves ps WHERE ps.post_id = p.id) as saves_count,
  (SELECT COUNT(*) FROM public.comments c WHERE c.post_id = p.id) as comments_count
FROM public.posts p;

-- 8. Direct Messages Table
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  text TEXT,
  system BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
