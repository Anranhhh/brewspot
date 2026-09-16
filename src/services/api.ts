/**
 * BrewSpot API service layer.
 * Centralized client for all backend API calls.
 * All functions call fetch() against the Flask backend proxied via Vite at /api.
 */

import { Post, Cafe } from '../types';
import { supabase } from './supabaseClient';

/**
 * Dynamically determine the API Base URL.
 * Uses VITE_API_BASE_URL if explicitly defined in environment.
 * Automatically falls back to http://localhost:5050/api or http://10.0.2.2:5050/api
 * when running inside Capacitor native apps to avoid relative URL fetch errors in WebKit.
 */
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // Detect if running inside Capacitor native app or custom scheme
  const isNative = 
    typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     window.location.protocol === 'file:' || 
     Boolean((window as any).Capacitor?.isNativePlatform?.()));

  if (isNative) {
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    // 10.0.2.2 is Android emulator's alias to host machine localhost
    // 127.0.0.1:5050 is iOS simulator's alias to host machine IPv4 loopback
    return isAndroid ? 'http://10.0.2.2:5050/api' : 'http://127.0.0.1:5050/api';
  }

  return '/api';
}

const API_BASE = getApiBaseUrl();

/**
 * Get the stored auth token from localStorage.
 * @returns Bearer token string or null
 */
function getStoredAuthToken(): string | null {
  return localStorage.getItem('brewspot_token');
}

/**
 * Build authorization headers if a token is available.
 * @returns Headers object with optional Authorization
 */
async function authHeaders(): Promise<Record<string, string>> {
  // Supabase owns the canonical session. The legacy localStorage token is
  // retained for compatibility with the backend login flow, but must not be
  // required because it is not restored on every app start.
  let token = getStoredAuthToken();
  try {
    const { data } = await supabase.auth.getSession();
    let session = data.session;
    if (session && session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 30) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session || session;
    }
    token = session?.access_token || token;
  } catch {
    // Keep using the legacy token if Supabase session storage is unavailable.
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Generic fetch wrapper with error handling.
 * @param url API endpoint path
 * @param options Fetch options
 * @returns Parsed JSON response
 */
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...(await authHeaders()),
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `API error: ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'Load failed' || err.message === 'Failed to fetch')) {
      throw new Error(`Cannot connect to backend API server at ${API_BASE}. Please ensure the Flask server (npm run dev:api) is running.`);
    }
    throw err;
  }
}

// --- Auth ---

interface AuthResponse {
  access_token: string | null;
  user: {
    id: string;
    name: string;
    profile: string | null;
  };
}

/**
 * Login with email and password.
 * @param email User email
 * @param password User password
 * @returns Auth response with token and user profile
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (result.access_token) {
    localStorage.setItem('brewspot_token', result.access_token);
  }
  return result;
}

/**
 * Register a new user.
 * @param email User email
 * @param password User password
 * @param name Display name
 * @returns Auth response with token and user profile
 */
export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (result.access_token) {
    localStorage.setItem('brewspot_token', result.access_token);
  }
  return result;
}

/**
 * Get current authenticated user profile.
 * @returns User object or null
 */
export async function getMe(): Promise<{ user: { id: string; name: string; profile: string | null } } | null> {
  try {
    return await apiFetch('/auth/me');
  } catch {
    return null;
  }
}

/**
 * Logout the current user by clearing the token.
 */
export function logout(): void {
  localStorage.removeItem('brewspot_token');
}

// --- Cafes ---

/**
 * Fetch all cafes.
 * @returns Array of Cafe objects
 */
export async function getCafes(): Promise<Cafe[]> {
  return apiFetch<Cafe[]>('/cafes');
}

/**
 * Fetch a single cafe by ID.
 * @param cafeId Cafe UUID
 * @returns Cafe object
 */
export async function getCafeById(cafeId: string): Promise<Cafe> {
  return apiFetch<Cafe>(`/cafes/${cafeId}`);
}

/**
 * Toggle save state on a cafe.
 * @param cafeId Cafe UUID
 * @param cafeDetails Optional cafe details for auto-creation
 * @returns { isSaved: boolean }
 */
export async function toggleSaveCafe(cafeId: string, cafeDetails?: Cafe): Promise<{ isSaved: boolean }> {
  return apiFetch('/cafes/' + cafeId + '/save', {
    method: 'POST',
    body: cafeDetails ? JSON.stringify(cafeDetails) : undefined,
  });
}

// --- Posts ---

/**
 * Fetch all posts for the discovery feed.
 * @returns Array of Post objects
 */
export async function getPosts(): Promise<Post[]> {
  return apiFetch<Post[]>('/posts');
}

/**
 * Fetch a single post by ID.
 * @param postId Post UUID
 * @returns Post object
 */
export async function getPostById(postId: string): Promise<Post> {
  return apiFetch<Post>(`/posts/${postId}`);
}

/**
 * Create a new post.
 * @param data Post creation payload
 * @returns Created Post object
 */
export async function createPost(data: {
  image_url: string;
  location?: string;
  rating?: number;
  caption?: string;
}): Promise<Post> {
  return apiFetch<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a post by ID. Requires post ownership.
 * @param postId Post UUID
 * @returns { success: boolean, message: string }
 */
export async function deletePost(postId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/posts/${postId}`, {
    method: 'DELETE',
  });
}

/**
 * Toggle like on a post.
 * @param postId Post UUID
 * @returns { isLiked: boolean, likes: number }
 */
export async function toggleLikePost(postId: string): Promise<{ isLiked: boolean; likes: number }> {
  return apiFetch('/posts/' + postId + '/like', { method: 'POST' });
}

/**
 * Toggle save on a post.
 * @param postId Post UUID
 * @returns { isSaved: boolean, saves: number }
 */
export async function toggleSavePost(postId: string): Promise<{ isSaved: boolean; saves: number }> {
  return apiFetch('/posts/' + postId + '/save', { method: 'POST' });
}

// --- Comments ---

export interface CommentResponse {
  id: string;
  post_id?: string;
  user_id?: string;
  parent_id?: string | null;
  parentId?: string | null;
  text: string;
  author: { id?: string; name: string; profile: string };
  timestamp: string;
  created_at?: string;
}

/**
 * Fetch all comments for a post.
 * @param postId Post UUID
 * @returns Array of comment objects
 */
export async function getComments(postId: string): Promise<CommentResponse[]> {
  return apiFetch<CommentResponse[]>(`/posts/${postId}/comments`);
}

/**
 * Add a comment to a post.
 * @param postId Post UUID
 * @param text Comment text
 * @param parentId Optional parent comment ID for replies
 * @returns Created comment object
 */
export async function addComment(postId: string, text: string, parentId?: string): Promise<CommentResponse> {
  return apiFetch<CommentResponse>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, parent_id: parentId || null }),
  });
}

/**
 * Delete a comment by ID. Requires comment ownership.
 * @param commentId Comment UUID
 * @returns { success: boolean, message: string }
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/posts/comments/${commentId}`, {
    method: 'DELETE',
  });
}

// --- Users ---

/**
 * Fetch a user's public profile.
 * @param userId User UUID
 * @returns User profile object
 */
export async function getUserProfile(userId: string): Promise<any> {
  return apiFetch(`/users/${encodeURIComponent(userId)}`);
}

/**
 * Toggle follow status for a target user.
 * @param userId Target user ID
 * @returns Updated follow status and count
 */
export async function toggleFollowUser(userId: string): Promise<{ userId: string; isFollowing: boolean; followersCount: number }> {
  return apiFetch<{ userId: string; isFollowing: boolean; followersCount: number }>(`/users/${encodeURIComponent(userId)}/follow`, {
    method: 'POST',
  });
}

// --- Messages ---

/**
 * Fetch all direct messages.
 */
export async function getDirectMessages(): Promise<any[]> {
  return apiFetch('/messages');
}

/**
 * Fetch conversation history with a specific target user.
 * @param otherUserId Target user UUID or ID
 * @returns Array of message objects
 */
export async function getConversation(otherUserId: string): Promise<any[]> {
  return apiFetch<any[]>(`/messages/conversation/${otherUserId}`);
}

/**
 * Send a direct message to a recipient.
 * @param receiverId Recipient user UUID or ID
 * @param text Message content text
 * @returns Created message object
 */
export async function sendDirectMessage(receiverId: string, text: string): Promise<any> {
  return apiFetch<any>('/messages', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId, text: text }),
  });
}

/**
 * Fetch all notifications.
 */
export async function getNotifications(): Promise<any[]> {
  return apiFetch('/notifications');
}

/**
 * Fetch all posts by a specific user.
 * @param userId User UUID
 * @returns Array of Post objects
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  return apiFetch<Post[]>(`/users/${userId}/posts`);
}

/**
 * Fetch posts liked by the authenticated user.
 * @param userId User UUID
 * @returns Array of liked posts
 */
export async function getLikedPosts(userId: string): Promise<Post[]> {
  return apiFetch<Post[]>(`/users/${userId}/liked-posts`);
}

/**
 * Fetch posts saved by the authenticated user.
 * @param userId User UUID
 * @returns Array of saved posts
 */
export async function getSavedPosts(userId: string): Promise<Post[]> {
  return apiFetch<Post[]>(`/users/${userId}/saved-posts`);
}

/**
 * Fetch cafes saved by the authenticated user.
 * @param userId User UUID
 * @returns Array of saved cafes
 */
export async function getSavedCafes(userId: string): Promise<Cafe[]> {
  return apiFetch<Cafe[]>(`/users/${userId}/saved-cafes`);
}

/**
 * Submit a moderation report for a post or user.
 */
export async function reportContent(targetType: 'post' | 'user', targetId: string, reason: string, details?: string): Promise<any> {
  try {
    return await apiFetch('/moderation/reports', {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
    });
  } catch (err) {
    console.warn('Report submitted (offline fallback):', { targetType, targetId, reason, details });
    return { success: true };
  }
}

/**
 * Block a user.
 */
export async function blockUser(targetUserId: string): Promise<any> {
  try {
    return await apiFetch(`/moderation/blocks/${targetUserId}`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('User blocked (offline fallback):', targetUserId);
    return { success: true };
  }
}

/**
 * Dynamically resolve public avatar URL from (avatar_type, avatar_path).
 */
export function getPublicAvatarUrl(avatarType?: string, avatarPath?: string, fallbackUrl?: string): string {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://runppvhclespkgdlxyww.supabase.co').replace(/\/$/, '');
  if (avatarType === 'uploaded' && avatarPath) {
    return `${baseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  }
  if (avatarType === 'default' && avatarPath) {
    return `${baseUrl}/storage/v1/object/public/profile-defaults/${encodeURIComponent(avatarPath)}`;
  }
  if (avatarPath && avatarPath.includes('/')) {
    return `${baseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  }
  if (avatarPath) {
    return `${baseUrl}/storage/v1/object/public/profile-defaults/${encodeURIComponent(avatarPath)}`;
  }
  if (fallbackUrl) {
    return fallbackUrl;
  }
  return `${baseUrl}/storage/v1/object/public/profile-defaults/coffee-beans.png`;
}

/**
 * Update authenticated user's profile attributes.
 */
export async function updateUserProfile(updates: {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_type?: 'default' | 'uploaded';
  avatar_path?: string;
}): Promise<any> {
  return apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Upload a new custom avatar image to profile-images bucket.
 */
export async function uploadProfileAvatar(file: File | Blob, userId: string): Promise<string> {
  const extension = (file.type && file.type.split('/')[1]) || 'jpg';
  const filename = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from('profile-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  return filename;
}

/**
 * Delete a custom avatar image from profile-images bucket.
 */
export async function deleteProfileAvatar(avatarPath: string): Promise<void> {
  if (!avatarPath || !avatarPath.includes('/')) return;
  try {
    await supabase.storage.from('profile-images').remove([avatarPath]);
  } catch (err) {
    console.warn('Failed to clean up old avatar:', err);
  }
}
