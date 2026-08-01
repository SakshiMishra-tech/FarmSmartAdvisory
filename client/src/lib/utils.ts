import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { transliterateInput } from "./transliteration"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Number translation utility
export function translateNumber(num: number, language: string): string {
  if (language === 'hi') {
    const hindiNumbers = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ', 'दस'];
    if (num >= 0 && num <= 10) {
      return hindiNumbers[num];
    }
    return num.toString();
  } else if (language === 'od') {
    const odiaNumbers = ['ଶୂନ୍ୟ', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ', 'ଦଶ'];
    if (num >= 0 && num <= 10) {
      return odiaNumbers[num];
    }
    return num.toString();
  }
  return num.toString();
}

// Format numbers with proper localization
export function formatNumber(num: number, language: string): string {
  if (language === 'hi' || language === 'od') {
    // For Hindi and Odia, use Indian number system
    return new Intl.NumberFormat('en-IN').format(num);
  }
  return new Intl.NumberFormat('en-US').format(num);
}

// Format units with proper localization
export function formatUnit(unit: string, language: string): string {
  const unitMap: Record<string, Record<string, string>> = {
    'kg/ha': {
      'hi': 'किग्रा/हेक्टेयर',
      'od': 'କିଗ୍ରା/ହେକ୍ଟର',
      'en': 'kg/ha'
    },
    '°C': {
      'hi': '°से',
      'od': '°ସେ',
      'en': '°C'
    },
    '%': {
      'hi': '%',
      'od': '%',
      'en': '%'
    },
    'mm': {
      'hi': 'मिमी',
      'od': 'ମିମି',
      'en': 'mm'
    },
    'hectares': {
      'hi': 'हेक्टेयर',
      'od': 'ହେକ୍ଟର',
      'en': 'hectares'
    },
    'tons': {
      'hi': 'टन',
      'od': 'ଟନ',
      'en': 'tons'
    }
  };
  
  return unitMap[unit]?.[language] || unit;
}

// Get localized state name
export function getLocalizedStateName(state: string, language: string): string {
  const stateKey = `state.${state.toLowerCase()}`;
  return stateKey; // This will be used with t() function
}

// Get localized district name
export function getLocalizedDistrictName(district: string, language: string): string {
  if (language === 'hi' || language === 'od') {
    return transliterateInput(district.toLowerCase(), language);
  }

  const districtKey = `district.${district.toLowerCase()}`;
  return districtKey; // This will be used with t() function
}

// Get localized crop name
export function getLocalizedCropName(crop: string, language: string): string {
  const cropKey = `crop.${crop.toLowerCase()}`;
  return cropKey; // This will be used with t() function
}

// Get localized season name
export function getLocalizedSeasonName(season: string, language: string): string {
  const seasonKey = `season.${season.toLowerCase()}`;
  return seasonKey; // This will be used with t() function
}
