/**
 * BrewSpot API service layer.
 * Centralized client for all backend API calls.
 * All functions call fetch() against the Flask backend proxied via Vite at /api.
 */

import { Post, Cafe } from '../types';

const API_BASE = '/api';

/**
 * Get the stored auth token from localStorage.
 * @returns Bearer token string or null
 */
function getAuthToken(): string | null {
  return localStorage.getItem('brewspot_token');
}

/**
 * Build authorization headers if a token is available.
 * @returns Headers object with optional Authorization
 */
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
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
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `API error: ${response.status}`);
  }

  return response.json();
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
 * @returns { isSaved: boolean }
 */
export async function toggleSaveCafe(cafeId: string): Promise<{ isSaved: boolean }> {
  return apiFetch('/cafes/' + cafeId + '/save', { method: 'POST' });
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

interface CommentResponse {
  id: string;
  text: string;
  author: { name: string; profile: string };
  timestamp: string;
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
 * @returns Created comment object
 */
export async function addComment(postId: string, text: string): Promise<CommentResponse> {
  return apiFetch<CommentResponse>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// --- Users ---

/**
 * Fetch a user's public profile.
 * @param userId User UUID
 * @returns User profile object
 */
export async function getUserProfile(userId: string): Promise<{ id: string; name: string; profile: string | null }> {
  return apiFetch(`/users/${userId}`);
}

// --- Messages ---

/**
 * Fetch all direct messages.
 */
export async function getDirectMessages(): Promise<any[]> {
  return apiFetch('/messages');
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
