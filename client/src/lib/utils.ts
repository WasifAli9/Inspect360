import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a URL to a relative path starting with /objects/
 * Handles both absolute URLs (http://...) and relative paths (/objects/...)
 */
function normalizeObjectUrl(url: string): string | null {
  if (!url) return null;
  
  // If it's already a relative path starting with /objects/, return as is
  if (url.startsWith('/objects/')) {
    return url;
  }
  
  // If it's an absolute URL, extract the pathname
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      if (pathname.startsWith('/objects/')) {
        return pathname;
      }
    } catch (e) {
      // Invalid URL
      return null;
    }
  }
  
  return null;
}

/**
 * Extracts the file URL from an Uppy upload response.
 * The upload-direct endpoint returns: { url: "/objects/...", uploadURL: "/objects/..." }
 * This function checks multiple possible locations in the response structure.
 * Returns a normalized relative path starting with /objects/
 */
export function extractFileUrlFromUploadResponse(file: any, response?: any): string | null {
  // Method 1: Check file.response.body (most reliable - Uppy stores PUT response here)
  // Uppy may store it as a string or already parsed object
  if (file?.response?.body) {
    try {
      let body = file.response.body;
      // Try parsing if it's a string
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // Not JSON, might be plain text URL
          const normalized = normalizeObjectUrl(body);
          if (normalized) return normalized;
        }
      }
      
      // Check for url or uploadURL in parsed body
      if (typeof body === 'object' && body !== null) {
        const url = body.url || body.uploadURL || body.path || body.pathname;
        if (url) {
          const normalized = normalizeObjectUrl(url);
          if (normalized) return normalized;
        }
      }
    } catch (e) {
      // Error parsing, continue to next method
    }
  }
  
  // Method 2: Check file.response directly (sometimes Uppy stores it here)
  if (file?.response) {
    // Check various possible properties
    const url = file.response.url || file.response.uploadURL || file.response.path || file.response.pathname;
    if (url) {
      const normalized = normalizeObjectUrl(url);
      if (normalized) return normalized;
    }
    
    // Also check if response itself is a string URL
    if (typeof file.response === 'string') {
      const normalized = normalizeObjectUrl(file.response);
      if (normalized) return normalized;
    }
  }
  
  // Method 3: Check response.body
  if (response?.body) {
    try {
      let body = response.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // Not JSON, might be plain text URL
          const normalized = normalizeObjectUrl(body);
          if (normalized) return normalized;
        }
      }
      
      if (typeof body === 'object' && body !== null) {
        const url = body.url || body.uploadURL || body.path || body.pathname;
        if (url) {
          const normalized = normalizeObjectUrl(url);
          if (normalized) return normalized;
        }
      }
    } catch (e) {
      // Not JSON or invalid
    }
  }
  
  // Method 4: Check top-level response properties
  if (response) {
    const url = response.url || response.uploadURL || response.path || response.pathname;
    if (url) {
      const normalized = normalizeObjectUrl(url);
      if (normalized) return normalized;
    }
  }
  
  // Method 5: Check file.uploadURL (sometimes Uppy stores it here directly)
  if (file?.uploadURL) {
    const normalized = normalizeObjectUrl(file.uploadURL);
    if (normalized) return normalized;
  }
  
  // Method 6: Construct from objectId if available in metadata
  if (file?.meta?.objectId) {
    return `/objects/${file.meta.objectId}`;
  }
  
  // Method 7: Extract objectId from upload URL (most reliable fallback)
  if (file?.meta?.originalUploadURL) {
    try {
      const uploadUrl = file.meta.originalUploadURL;
      const urlObj = new URL(uploadUrl);
      const objectId = urlObj.searchParams.get('objectId');
      if (objectId) {
        return `/objects/${objectId}`;
      }
      // Also try extracting from pathname
      const pathname = urlObj.pathname;
      if (pathname.startsWith('/objects/')) {
        return pathname;
      }
    } catch (e) {
      // Invalid URL, continue
    }
  }
  
  // Method 8: Try to extract from the upload URL stored in file.source
  if (file?.source) {
    try {
      const urlObj = new URL(file.source);
      const objectId = urlObj.searchParams.get('objectId');
      if (objectId) {
        return `/objects/${objectId}`;
      }
    } catch (e) {
      // Invalid URL
    }
  }
  
  return null;
}
