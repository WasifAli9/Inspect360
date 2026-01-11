// IP Geolocation service to detect user's country
export interface GeolocationResult {
  countryCode: string;
  countryName: string;
  city?: string;
  timezone?: string;
}

// Free IP geolocation service using backend proxy to avoid CORS issues
export async function detectUserCountry(): Promise<GeolocationResult | null> {
  try {
    // Use backend proxy endpoint to avoid CORS issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch("/api/geolocation", {
      signal: controller.signal,
      credentials: "include",
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn("Failed to detect country from IP");
      return null;
    }
    
    const data = await response.json();
    
    // Validate response has required fields
    if (!data.countryCode) {
      console.warn("IP geolocation response missing country code");
      return null;
    }
    
    return {
      countryCode: data.countryCode || "GB", // Default to GB
      countryName: data.countryName || "United Kingdom",
      city: data.city,
      timezone: data.timezone,
    };
  } catch (error) {
    // Timeout or network error - fail silently
    if (error instanceof Error && error.name === 'AbortError') {
      // Silently handle timeout
    } else {
      // Only log non-timeout errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn("Error detecting country:", error);
      }
    }
    return null;
  }
}

// Cached result to avoid multiple API calls
let cachedCountry: GeolocationResult | null | undefined = undefined;

export async function getCachedUserCountry(): Promise<GeolocationResult> {
  if (cachedCountry === undefined) {
    cachedCountry = await detectUserCountry();
  }
  
  return cachedCountry || {
    countryCode: "GB",
    countryName: "United Kingdom",
  };
}
