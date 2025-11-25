import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import {
  getPhoneCodeForCountry,
  COUNTRY_TO_PHONE_CODE,
  parsePhoneNumber,
  combinePhoneNumber,
} from "@shared/phoneCountryCodes";
import { COMMON_COUNTRIES } from "@shared/countryUtils";

interface PhoneInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  onCountryCodeChange?: (countryCode: string) => void;
  onNumberChange?: (number: string) => void;
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
  // For form libraries like react-hook-form
  field?: {
    value?: string | null;
    onChange?: (value: string) => void;
  };
}

export function PhoneInput({
  value: controlledValue,
  onChange,
  onCountryCodeChange,
  onNumberChange,
  id,
  name,
  label,
  placeholder,
  className,
  disabled,
  "data-testid": dataTestId,
  field,
}: PhoneInputProps) {
  const { countryCode: userCountryCode } = useLocale();
  const defaultPhoneCode = getPhoneCodeForCountry(userCountryCode);

  // Use controlled value if provided, otherwise use field value
  const phoneValue = controlledValue ?? field?.value ?? "";

  // Parse the phone number into country code and number
  const parsed = parsePhoneNumber(phoneValue);
  // If parsed country code exists, use it; otherwise use user's country code
  // Always default to user's country code when no phone value exists
  const initialCountryCode = (phoneValue && parsed.countryCode) ? parsed.countryCode : defaultPhoneCode;
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [number, setNumber] = useState(parsed.number || "");

  // Update internal state when external value or user country changes
  useEffect(() => {
    const parsed = parsePhoneNumber(phoneValue);
    // Update country code if parsed has one, otherwise use user's default
    if (phoneValue && parsed.countryCode) {
      // Only update if there's an actual phone value with a country code
      setCountryCode(parsed.countryCode);
    } else {
      // If no phone value or no country code in parsed value, use user's default country code
      setCountryCode(defaultPhoneCode);
    }
    setNumber(parsed.number || "");
  }, [phoneValue, defaultPhoneCode]);

  const handleCountryCodeChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    const combined = combinePhoneNumber(newCountryCode, number);
    if (field?.onChange) {
      field.onChange(combined);
    }
    if (onChange) {
      onChange(combined);
    }
    if (onCountryCodeChange) {
      onCountryCodeChange(newCountryCode);
    }
  };

  const handleNumberChange = (newNumber: string) => {
    setNumber(newNumber);
    const combined = combinePhoneNumber(countryCode, newNumber);
    if (field?.onChange) {
      field.onChange(combined);
    }
    if (onChange) {
      onChange(combined);
    }
    if (onNumberChange) {
      onNumberChange(newNumber);
    }
  };

  // Create list of unique phone codes with their representative countries
  const phoneCodeOptions: Array<{ code: string; countries: string[] }> = [];
  const codeMap = new Map<string, string[]>();

  // Group countries by phone code
  for (const country of COMMON_COUNTRIES) {
    const phoneCode = getPhoneCodeForCountry(country.code);
    if (!codeMap.has(phoneCode)) {
      codeMap.set(phoneCode, []);
    }
    codeMap.get(phoneCode)!.push(country.name);
  }

  // Convert to array format
  for (const [code, countries] of codeMap.entries()) {
    phoneCodeOptions.push({ code, countries });
  }

  // Sort by phone code
  phoneCodeOptions.sort((a, b) => {
    const numA = parseInt(a.code.replace("+", "")) || 9999;
    const numB = parseInt(b.code.replace("+", "")) || 9999;
    return numA - numB;
  });

  // Add other common codes if not already present
  const allCodes = new Set(phoneCodeOptions.map(opt => opt.code));
  const commonOtherCodes = [
    { code: "+44", countries: ["United Kingdom"] },
    { code: "+1", countries: ["United States", "Canada"] },
    { code: "+971", countries: ["United Arab Emirates"] },
    { code: "+61", countries: ["Australia"] },
    { code: "+353", countries: ["Ireland"] },
    { code: "+64", countries: ["New Zealand"] },
    { code: "+65", countries: ["Singapore"] },
    { code: "+91", countries: ["India"] },
    { code: "+27", countries: ["South Africa"] },
  ];

  for (const option of commonOtherCodes) {
    if (!allCodes.has(option.code)) {
      phoneCodeOptions.push(option);
      allCodes.add(option.code);
    }
  }

  const displayLabel = label || "Phone Number";
  const displayPlaceholder = placeholder || "1234567890";
  const displayId = id || name || "phone";

  return (
    <div className={className}>
      {label && <Label htmlFor={displayId}>{displayLabel}</Label>}
      <div className="grid grid-cols-3 gap-2">
        <div>
          {!label && <Label htmlFor={`${displayId}-country-code`} className="sr-only">Country Code</Label>}
          <Select
            value={countryCode}
            onValueChange={handleCountryCodeChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${displayId}-country-code`}
              name={name ? `${name}CountryCode` : undefined}
              data-testid={dataTestId ? `${dataTestId}-country-code` : undefined}
              className="h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {phoneCodeOptions.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.code} {option.countries[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          {!label && <Label htmlFor={displayId} className="sr-only">{displayLabel}</Label>}
          <Input
            id={displayId}
            type="tel"
            value={number}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={displayPlaceholder}
            disabled={disabled}
            data-testid={dataTestId ? `${dataTestId}-number` : dataTestId}
          />
        </div>
      </div>
      {/* Hidden input for form submission with combined value */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={combinePhoneNumber(countryCode, number)}
        />
      )}
    </div>
  );
}

