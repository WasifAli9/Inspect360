// Mapping of ISO 3166-1 alpha-2 country codes to phone country codes
export const COUNTRY_TO_PHONE_CODE: Record<string, string> = {
  // United Kingdom and Crown Dependencies
  GB: "+44",
  GG: "+44",
  IM: "+44",
  JE: "+44",
  
  // United States and territories
  US: "+1",
  CA: "+1",
  AS: "+1",
  GU: "+1",
  MP: "+1",
  PR: "+1",
  VI: "+1",
  
  // United Arab Emirates
  AE: "+971",
  
  // Australia
  AU: "+61",
  
  // Ireland
  IE: "+353",
  
  // New Zealand
  NZ: "+64",
  
  // Singapore
  SG: "+65",
  
  // India
  IN: "+91",
  
  // South Africa
  ZA: "+27",
  
  // Saudi Arabia
  SA: "+966",
  
  // Qatar
  QA: "+974",
  
  // Kuwait
  KW: "+965",
  
  // Bahrain
  BH: "+973",
  
  // Oman
  OM: "+968",
  
  // Additional common countries
  FR: "+33",
  DE: "+49",
  IT: "+39",
  ES: "+34",
  NL: "+31",
  BE: "+32",
  CH: "+41",
  AT: "+43",
  SE: "+46",
  NO: "+47",
  DK: "+45",
  FI: "+358",
  PL: "+48",
  PT: "+351",
  GR: "+30",
  TR: "+90",
  RU: "+7",
  CN: "+86",
  JP: "+81",
  KR: "+82",
  BR: "+55",
  MX: "+52",
  AR: "+54",
  CL: "+56",
  CO: "+57",
  PE: "+51",
  EG: "+20",
  NG: "+234",
  KE: "+254",
  ZW: "+263",
  PK: "+92",
  BD: "+880",
  ID: "+62",
  MY: "+60",
  TH: "+66",
  VN: "+84",
  PH: "+63",
};

// Get phone country code from ISO country code
export function getPhoneCodeForCountry(countryCode: string): string {
  return COUNTRY_TO_PHONE_CODE[countryCode.toUpperCase()] || "+1";
}

// Reverse lookup: get country code from phone code (for most common ones)
export function getCountryCodeFromPhoneCode(phoneCode: string): string | null {
  const normalized = phoneCode.startsWith("+") ? phoneCode : `+${phoneCode}`;
  for (const [country, code] of Object.entries(COUNTRY_TO_PHONE_CODE)) {
    if (code === normalized) {
      return country;
    }
  }
  return null;
}

// Parse phone number: splits combined phone number into country code and number
// Handles formats like: "+44 7700 900000", "+44 7700900000", "447700900000", etc.
export function parsePhoneNumber(fullPhone: string | null | undefined): {
  countryCode: string | null;
  number: string;
} {
  if (!fullPhone) {
    return { countryCode: null, number: "" };
  }

  const trimmed = fullPhone.trim();
  if (!trimmed) {
    return { countryCode: null, number: "" };
  }

  // Try to extract country code from the beginning
  // Match common patterns: +44, +1, +971, etc.
  const phoneCodeMatch = trimmed.match(/^(\+\d{1,3})[\s\-]*(.*)$/);
  if (phoneCodeMatch) {
    return {
      countryCode: phoneCodeMatch[1],
      number: phoneCodeMatch[2].trim(),
    };
  }

  // If no country code prefix, return null for country code and the whole thing as number
  // This allows the component to use the user's default country code
  return { countryCode: null, number: trimmed };
}

// Combine country code and number into a single phone string
export function combinePhoneNumber(countryCode: string, number: string): string {
  if (!number.trim()) {
    return "";
  }
  const normalizedCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
  const normalizedNumber = number.trim();
  return `${normalizedCode} ${normalizedNumber}`;
}

