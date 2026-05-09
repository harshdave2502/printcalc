// ─────────────────────────────────────────────────────────────────────
// Country-specific terminology + size presets.
// Subscriber sets country once → calculator auto-translates.
// ─────────────────────────────────────────────────────────────────────

export type CountryCode = 'US' | 'UK' | 'IN' | 'AU' | 'CA' | 'AE' | 'SG' | 'ZA';

export interface Country {
  code: CountryCode;
  label: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  sizeStandard: 'inch' | 'mm';
  vocabulary: Record<string, string>;
}

export const COUNTRIES: Country[] = [
  {
    code: 'US',
    label: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    sizeStandard: 'inch',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Presentation Folder',
      catalog: 'Catalog',
      color: 'Color',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'Letter (8.5×11")',
      tabloid_size: 'Tabloid (11×17")',
      half_letter: 'Half Letter (5.5×8.5")',
    },
  },
  {
    code: 'UK',
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Leaflet',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
  {
    code: 'IN',
    label: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Pamphlet',
      business_card: 'Visiting Card',
      letterhead: 'Letter Pad',
      presentation_folder: 'File / Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Centre Pin',
      perfect_bound: 'Hot Glue Binding',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
  {
    code: 'AU',
    label: 'Australia / New Zealand',
    flag: '🇦🇺',
    currency: 'AUD',
    currencySymbol: 'A$',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
  {
    code: 'CA',
    label: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: 'C$',
    sizeStandard: 'inch',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'Letter (8.5×11")',
      tabloid_size: 'Tabloid (11×17")',
      half_letter: 'Half Letter (5.5×8.5")',
    },
  },
  {
    code: 'AE',
    label: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'د.إ',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
  {
    code: 'SG',
    label: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    currencySymbol: 'S$',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Name Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
  {
    code: 'ZA',
    label: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    sizeStandard: 'mm',
    vocabulary: {
      flyer: 'Flyer',
      business_card: 'Business Card',
      letterhead: 'Letterhead',
      presentation_folder: 'Folder',
      catalog: 'Catalogue',
      color: 'Colour',
      saddle_stitch: 'Saddle Stitch',
      perfect_bound: 'Perfect Bound',
      letter_size: 'A4',
      tabloid_size: 'A3',
      half_letter: 'A5',
    },
  },
];

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export function vocab(countryCode: string, key: string, fallback?: string): string {
  const country = getCountry(countryCode);
  return country.vocabulary[key] || fallback || key;
}

export function formatPrice(amount: number, countryCode: string = 'US'): string {
  const country = getCountry(countryCode);
  return `${country.currencySymbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
