export type Screen = 'login' | 'register' | 'discovery' | 'cafe-details' | 'profile' | 'user-profile' | 'new-post' | 'messages' | 'chat-window' | 'post-details' | 'explore' | 'success';

export interface Author {
  id?: string;
  name: string;
  profile: string;
}

export interface Post {
  id: string;
  imageUrl: string;
  author?: Author;
  location?: string;
  rating?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  timestamp?: string;
  caption?: string;
}

export interface Cafe {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  priceLevel: string;
  type: string;
  address: string;
  status: string;
  tags: string[];
  heroImage: string;
  inspirationImages: string[];
  isSaved?: boolean;
  latitude?: number;
  longitude?: number;
}

export type ProfileTab = 'posts' | 'liked' | 'saved' | 'shops';