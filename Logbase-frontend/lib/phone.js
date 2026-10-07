// Phone numbers. The country code decides how many digits a number must have.
// Numbers are stored in international form, e.g. +2348031234567.
//
// min / max: digits AFTER the country code (without the leading 0 some countries write locally).
// trunk:     the country writes a leading 0 locally (0803… in Nigeria) that is dropped internationally.

export const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', dial: '234', min: 10, max: 10, trunk: true },
  { code: 'GH', name: 'Ghana', dial: '233', min: 9, max: 9, trunk: true },
  { code: 'KE', name: 'Kenya', dial: '254', min: 9, max: 9, trunk: true },
  { code: 'ZA', name: 'South Africa', dial: '27', min: 9, max: 9, trunk: true },
  { code: 'TZ', name: 'Tanzania', dial: '255', min: 9, max: 9, trunk: true },
  { code: 'UG', name: 'Uganda', dial: '256', min: 9, max: 9, trunk: true },
  { code: 'RW', name: 'Rwanda', dial: '250', min: 9, max: 9, trunk: true },
  { code: 'ET', name: 'Ethiopia', dial: '251', min: 9, max: 9, trunk: true },
  { code: 'ZM', name: 'Zambia', dial: '260', min: 9, max: 9, trunk: true },
  { code: 'ZW', name: 'Zimbabwe', dial: '263', min: 9, max: 9, trunk: true },
  { code: 'CM', name: 'Cameroon', dial: '237', min: 9, max: 9, trunk: false },
  { code: 'SN', name: 'Senegal', dial: '221', min: 9, max: 9, trunk: false },
  { code: 'CI', name: "Côte d'Ivoire", dial: '225', min: 10, max: 10, trunk: false },
  { code: 'EG', name: 'Egypt', dial: '20', min: 10, max: 10, trunk: true },
  { code: 'MA', name: 'Morocco', dial: '212', min: 9, max: 9, trunk: true },
  { code: 'US', name: 'United States / Canada', dial: '1', min: 10, max: 10, trunk: false },
  { code: 'GB', name: 'United Kingdom', dial: '44', min: 9, max: 10, trunk: true },
  { code: 'DE', name: 'Germany', dial: '49', min: 10, max: 11, trunk: true },
  { code: 'FR', name: 'France', dial: '33', min: 9, max: 9, trunk: true },
  { code: 'ES', name: 'Spain', dial: '34', min: 9, max: 9, trunk: false },
  { code: 'IT', name: 'Italy', dial: '39', min: 9, max: 10, trunk: false },
  { code: 'NL', name: 'Netherlands', dial: '31', min: 9, max: 9, trunk: true },
  { code: 'IN', name: 'India', dial: '91', min: 10, max: 10, trunk: true },
  { code: 'PK', name: 'Pakistan', dial: '92', min: 10, max: 10, trunk: true },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', min: 9, max: 9, trunk: true },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', min: 9, max: 9, trunk: true },
  { code: 'CN', name: 'China', dial: '86', min: 11, max: 11, trunk: false },
  { code: 'BR', name: 'Brazil', dial: '55', min: 10, max: 11, trunk: true },
  { code: 'MX', name: 'Mexico', dial: '52', min: 10, max: 10, trunk: false },
];

export const DEFAULT_COUNTRY = 'NG';

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

// The country whose code a full number starts with (longest code wins). digits = digits after "+".
export function countryFromDigits(digits) {
  return (
    [...COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => digits.startsWith(c.dial)) || null
  );
}

export function lengthLabel(country) {
  return country.min === country.max ? `${country.min}` : `${country.min}–${country.max}`;
}

// Reads what was typed for a country and says whether it is a complete number.
// Returns { valid, digits, e164, key, message }.
export function parsePhone(countryCode, raw) {
  const country = findCountry(countryCode);
  const text = String(raw || '').trim();
  let digits = text.replace(/\D/g, '');

  // the country code typed again (+234 803…, 234803…)
  if (digits.startsWith(country.dial) && (text.startsWith('+') || digits.length > country.max + (country.trunk ? 1 : 0))) {
    digits = digits.slice(country.dial.length);
  }
  // the local leading 0 (0803… → 803…)
  if (country.trunk && digits.startsWith('0')) digits = digits.slice(1);

  const valid = digits.length >= country.min && digits.length <= country.max;
  let message = '';
  if (!valid) {
    message =
      digits.length === 0
        ? `Enter the phone number (${lengthLabel(country)} digits after +${country.dial}).`
        : `${country.name} numbers have ${lengthLabel(country)} digits after +${country.dial}. You entered ${digits.length}.`;
  }

  return {
    valid,
    digits,
    e164: valid ? `+${country.dial}${digits}` : '',
    key: valid ? `${country.dial}${digits}` : '',
    message,
  };
}

// A comparable key for a number already saved. Numbers saved before country codes existed
// (0803…) are treated as Nigerian.
export function phoneKey(stored) {
  const text = String(stored || '').trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  if (text.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  if (digits.startsWith('234') && digits.length >= 13) return digits;
  return `234${digits}`;
}

// A saved number, ready to show: { country: 'Nigeria' | '', display: '+234 8031234567' }.
export function describePhone(stored) {
  const key = phoneKey(stored);
  if (!key) return { country: '', display: '' };
  const country = countryFromDigits(key);
  if (!country) return { country: '', display: `+${key}` };
  return { country: country.name, display: `+${country.dial} ${key.slice(country.dial.length)}` };
}
