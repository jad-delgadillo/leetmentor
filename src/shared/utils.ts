import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for merging Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique IDs
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format duration in human readable format
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Format timestamp for display
export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Check if we're in a Chrome extension context
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// Safe message sending with error handling
export async function sendMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!isExtensionContext()) {
      reject(new Error('Not in extension context'));
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Storage helpers
export const storage = {
  async get(keys: string | string[]): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    });
  },

  async set(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, resolve);
    });
  },

  async remove(keys: string | string[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.remove(keys, resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.clear(resolve);
    });
  }
};

// Local storage helpers (for larger data)
export const localStorage = {
  async get(keys: string | string[]): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  },

  async set(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  },

  async remove(keys: string | string[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }
};

// Validate API key format
export function isValidOpenAIKey(key: string): boolean {
  // Modern OpenAI API keys start with 'sk-' followed by 20+ characters
  // They can contain letters, numbers, and some special characters
  return /^sk-[a-zA-Z0-9_-]{20,}$/.test(key) && key.length >= 50;
}

// Error handler for async operations
export function handleAsyncError<T>(
  promise: Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  return promise.catch((error) => {
    console.error('Async operation failed:', error);
    return fallback;
  });
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Get difficulty color for UI
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'hard':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

// Parse LeetCode problem URL
export function parseLeetCodeUrl(url: string): { problemSlug: string; isValid: boolean } {
  const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
  return {
    problemSlug: match ? match[1] : '',
    isValid: !!match
  };
}
