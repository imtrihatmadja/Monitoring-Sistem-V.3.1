/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { safeStorage } from './lib/safeStorage';

// Get initial values from localStorage falling back to import.meta.env
const getInitialConfig = () => {
  const localUrl = safeStorage.getItem('dfw_supabase_url');
  const localKey = safeStorage.getItem('dfw_supabase_anon_key');
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const url = (localUrl || envUrl || '').trim();
  const key = (localKey || envKey || '').trim();
  
  const isConfigured = !!url && !!key && !url.includes('your-supabase-project');
  return { url, key, isConfigured };
};

const config = getInitialConfig();

export let isSupabaseConfigured = config.isConfigured;
export let supabaseUrl = config.url;
export let supabaseAnonKey = config.key;

export let supabase: any = null;

if (isSupabaseConfigured) {
  try {
    if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
      throw new Error('Supabase URL must start with http:// or https://');
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  } catch (err) {
    console.warn('Silent fallback: Supabase integration disabled due to malformed config:', err);
    supabase = null;
    isSupabaseConfigured = false;
  }
}

if (supabase) {
  // @ts-ignore
  window.client = supabase;
}

// Reinitialization helper
export function reinitializeSupabase(url: string, anonKey: string): boolean {
  const cleanedUrl = (url || '').trim();
  const cleanedKey = (anonKey || '').trim();
  
  if (cleanedUrl && cleanedKey && !cleanedUrl.includes('your-supabase-project') && (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://'))) {
    try {
      const testClient = createClient(cleanedUrl, cleanedKey, { auth: { persistSession: false } });
      if (testClient) {
        safeStorage.setItem('dfw_supabase_url', cleanedUrl);
        safeStorage.setItem('dfw_supabase_anon_key', cleanedKey);
        supabaseUrl = cleanedUrl;
        supabaseAnonKey = cleanedKey;
        isSupabaseConfigured = true;
        supabase = testClient;
        // @ts-ignore
        window.client = supabase;
        return true;
      }
    } catch (err) {
      console.error('Dynamic Supabase initiation failed:', err);
    }
  }

  safeStorage.removeItem('dfw_supabase_url');
  safeStorage.removeItem('dfw_supabase_anon_key');
  supabaseUrl = '';
  supabaseAnonKey = '';
  isSupabaseConfigured = false;
  supabase = null;
  // @ts-ignore
  window.client = null;
  return false;
}

// Helper to handle safe Supabase db actions with try-catch and falling back to localStorage
export async function safeSupabaseAction<T>(
  action: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  const currentSupabase = supabase;
  if (!isSupabaseConfigured || !currentSupabase) {
    return fallbackValue;
  }
  try {
    return await action();
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return fallbackValue;
  }
}

export function getSupabaseClient() {
  return supabase;
}

export function getIsSupabaseConfigured() {
  return isSupabaseConfigured;
}


