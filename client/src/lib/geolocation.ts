// IP Geolocation service to detect user's country
export interface GeolocationResult {
  countryCode: string;
  countryName: string;
  city?: string;
  timezone?: string;
}

// Free IP geolocation service using ipapi.co
export async function detectUserCountry(): Promise<GeolocationResult | null> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn("Failed to detect country from IP");
      return null;
    }
    
    const data = await response.json();
    
    // Validate response has required fields
    if (!data.country_code) {
      console.warn("IP geolocation response missing country code");
      return null;
    }
    
    return {
      countryCode: data.country_code || "GB", // Default to GB
      countryName: data.country_name || "United Kingdom",
      city: data.city,
      timezone: data.timezone,
    };
  } catch (error) {
    // Timeout or network error
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn("Country detection timed out");
    } else {
      console.error("Error detecting country:", error);
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
