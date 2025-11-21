// Country to Currency mapping (ISO 3166-1 alpha-2 country codes)
export const COUNTRY_TO_CURRENCY: Record<string, "GBP" | "USD" | "AED"> = {
  // GBP Countries
  GB: "GBP", // United Kingdom
  GG: "GBP", // Guernsey
  IM: "GBP", // Isle of Man
  JE: "GBP", // Jersey
  
  // USD Countries
  US: "USD", // United States
  AS: "USD", // American Samoa
  BQ: "USD", // Bonaire, Sint Eustatius and Saba
  EC: "USD", // Ecuador
  FM: "USD", // Micronesia
  GU: "USD", // Guam
  MH: "USD", // Marshall Islands
  MP: "USD", // Northern Mariana Islands
  PA: "USD", // Panama
  PR: "USD", // Puerto Rico
  PW: "USD", // Palau
  SV: "USD", // El Salvador
  TC: "USD", // Turks and Caicos Islands
  TL: "USD", // Timor-Leste
  UM: "USD", // United States Minor Outlying Islands
  VG: "USD", // Virgin Islands (British)
  VI: "USD", // Virgin Islands (U.S.)
  ZW: "USD", // Zimbabwe
  
  // AED Countries
  AE: "AED", // United Arab Emirates
};

// Default to GBP for countries not in the map
export function getCurrencyForCountry(countryCode: string): "GBP" | "USD" | "AED" {
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || "GBP";
}

// Currency symbols
export const CURRENCY_SYMBOLS: Record<"GBP" | "USD" | "AED", string> = {
  GBP: "£",
  USD: "$",
  AED: "د.إ",
};

// Date format patterns by country
export const COUNTRY_DATE_FORMATS: Record<string, string> = {
  // UK and Commonwealth (DD/MM/YYYY)
  GB: "dd/MM/yyyy",
  AU: "dd/MM/yyyy",
  NZ: "dd/MM/yyyy",
  IE: "dd/MM/yyyy",
  IN: "dd/MM/yyyy",
  ZA: "dd/MM/yyyy",
  SG: "dd/MM/yyyy",
  MY: "dd/MM/yyyy",
  HK: "dd/MM/yyyy",
  
  // US and territories (MM/DD/YYYY)
  US: "MM/dd/yyyy",
  PR: "MM/dd/yyyy",
  VI: "MM/dd/yyyy",
  GU: "MM/dd/yyyy",
  
  // Middle East (DD/MM/YYYY)
  AE: "dd/MM/yyyy",
  SA: "dd/MM/yyyy",
  QA: "dd/MM/yyyy",
  KW: "dd/MM/yyyy",
  BH: "dd/MM/yyyy",
  OM: "dd/MM/yyyy",
  
  // Canada (YYYY-MM-DD)
  CA: "yyyy-MM-dd",
  
  // Default for other countries (DD/MM/YYYY - ISO-like)
};

// Date-time format patterns by country
export const COUNTRY_DATETIME_FORMATS: Record<string, string> = {
  // UK and Commonwealth (DD/MM/YYYY HH:mm)
  GB: "dd/MM/yyyy 'at' h:mm a",
  AU: "dd/MM/yyyy 'at' h:mm a",
  NZ: "dd/MM/yyyy 'at' h:mm a",
  IE: "dd/MM/yyyy 'at' h:mm a",
  IN: "dd/MM/yyyy 'at' h:mm a",
  
  // US and territories (MM/DD/YYYY HH:mm)
  US: "MM/dd/yyyy 'at' h:mm a",
  PR: "MM/dd/yyyy 'at' h:mm a",
  
  // Middle East (DD/MM/YYYY HH:mm)
  AE: "dd/MM/yyyy 'at' h:mm a",
  SA: "dd/MM/yyyy 'at' h:mm a",
  
  // Canada (YYYY-MM-DD HH:mm)
  CA: "yyyy-MM-dd 'at' HH:mm",
};

export function getDateFormatForCountry(countryCode: string): string {
  return COUNTRY_DATE_FORMATS[countryCode.toUpperCase()] || "dd/MM/yyyy";
}

export function getDateTimeFormatForCountry(countryCode: string): string {
  return COUNTRY_DATETIME_FORMATS[countryCode.toUpperCase()] || "dd/MM/yyyy 'at' h:mm a";
}

// Short date format (for compact displays)
export function getShortDateFormatForCountry(countryCode: string): string {
  const format = getDateFormatForCountry(countryCode);
  return format.replace(/yyyy/g, "yy"); // Use 2-digit year
}

// List of common countries for dropdown
export const COMMON_COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "ZA", name: "South Africa" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
];

// Format currency amount based on currency type
export function formatCurrency(
  amount: number, 
  currency: "GBP" | "USD" | "AED", 
  minorUnits: boolean = true
): string {
  const value = minorUnits ? amount / 100 : amount;
  const symbol = CURRENCY_SYMBOLS[currency];
  
  // Format with appropriate decimal places
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // AED symbol goes after the amount
  if (currency === "AED") {
    return `${formatted} ${symbol}`;
  }
  
  // GBP and USD symbols go before
  return `${symbol}${formatted}`;
}
