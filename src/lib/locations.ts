import locationsData from '../content/locations.json';
import siteData from '../content/site.json';

export interface RawLocationRecord {
  country: string;
  latitude: number;
  longitude: number;
  type: 'office' | 'coverage';
  address?: string;
  email?: string;
  phone?: string;
}

export interface LocationNode {
  id: string;
  country: string;
  countryCode: string;
  continent: string;
  subregion?: string;
  city: string;
  latitude: number;
  longitude: number;
  type: 'office' | 'coverage';
  address?: string;
  email: string;
  phone: string;
  servingOfficeId?: string;
  servingOfficeCity?: string;
  servingOfficeCountry?: string;
}

export interface ContinentGroup {
  continent: string;
  locations: LocationNode[];
  officeCount: number;
  totalCount: number;
}

// Known port cities extracted from the address strings in locations.json
const PORT_CITIES: Record<string, string> = {
  Bangladesh: 'Chittagong',
  China: 'Qinhuangdao',
  India: 'Mumbai',
  Indonesia: 'Cilegon',
  Jordan: 'Aqaba',
  Malaysia: 'Port Klang',
  Malta: 'St Julians',
  Pakistan: 'Karachi',
  Philippines: 'Manila',
  'Saudi Arabia': 'Jeddah',
  Singapore: 'Singapore',
  'Sri Lanka': 'Colombo',
  Turkey: 'Istanbul',
  'United Arab Emirates': 'Dubai',
  Gibraltar: 'Algeciras',
  Italy: 'Cagliari',
  Spain: 'Algeciras',
  Guatemala: 'Guatemala City',
  Mexico: 'Lazaro Cardenas',
  Panama: 'Panama City',
  'United States': 'Houston',
  Argentina: 'Rosario',
  Brazil: 'Itacoatiara',
  Angola: 'Lagos Hub',
  Djibouti: 'Mombasa Hub',
  Egypt: 'Port Said',
  Gabon: 'Lagos Hub',
  Ghana: 'Lagos Hub',
  'Ivory Coast': 'Abidjan',
  Kenya: 'Mombasa',
  Morocco: 'Casablanca',
  Nigeria: 'Lagos',
  Togo: 'Lagos Hub',
};

const COUNTRY_CODES: Record<string, string> = {
  Angola: 'AO',
  Argentina: 'AR',
  Australia: 'AU',
  Bahrain: 'BH',
  Bangladesh: 'BD',
  Belgium: 'BE',
  Benin: 'BJ',
  Brazil: 'BR',
  Brunei: 'BN',
  Bulgaria: 'BG',
  Canada: 'CA',
  Chile: 'CL',
  China: 'CN',
  Colombia: 'CO',
  Croatia: 'HR',
  Cuba: 'CU',
  Cyprus: 'CY',
  Denmark: 'DK',
  Djibouti: 'DJ',
  Ecuador: 'EC',
  Egypt: 'EG',
  Estonia: 'EE',
  France: 'FR',
  Gabon: 'GA',
  Germany: 'DE',
  Ghana: 'GH',
  Gibraltar: 'GI',
  Guatemala: 'GT',
  Guinea: 'GN',
  Haiti: 'HT',
  Honduras: 'HN',
  'Hong Kong': 'HK',
  India: 'IN',
  Indonesia: 'ID',
  Ireland: 'IE',
  Italy: 'IT',
  'Ivory Coast': 'CI',
  Japan: 'JP',
  Jordan: 'JO',
  Kenya: 'KE',
  Kuwait: 'KW',
  Lebanon: 'LB',
  Libya: 'LY',
  Malaysia: 'MY',
  Maldives: 'MV',
  Malta: 'MT',
  Mauritius: 'MU',
  Mexico: 'MX',
  Morocco: 'MA',
  Mozambique: 'MZ',
  Myanmar: 'MM',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Nigeria: 'NG',
  Norway: 'NO',
  Oman: 'OM',
  Pakistan: 'PK',
  Panama: 'PA',
  Peru: 'PE',
  Philippines: 'PH',
  Portugal: 'PT',
  Qatar: 'QA',
  Romania: 'RO',
  'Saudi Arabia': 'SA',
  Senegal: 'SN',
  Seychelles: 'SC',
  Singapore: 'SG',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  Spain: 'ES',
  'Sri Lanka': 'LK',
  Taiwan: 'TW',
  Thailand: 'TH',
  'The Bahamas': 'BS',
  Togo: 'TG',
  Tunisia: 'TN',
  Turkey: 'TR',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  Uruguay: 'UY',
  Venezuela: 'VE',
  Vietnam: 'VN',
  Yemen: 'YE',
};

function slugifyId(continent: string, country: string): string {
  return `${continent}-${country}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function greatCircleDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Computes the local time string (h:mm AM/PM) at a given longitude
 * so every location card / tooltip shows accurate local time with tabular numerals.
 */
export function getLocalTimeAtLongitude(longitude: number, now = new Date()): string {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // Standard solar/nautical time zone offset approximation (15 deg per hour)
  // Special-case well-known half-hour maritime hubs (India +5.5, Sri Lanka +5.5)
  let offsetHours = Math.round(longitude / 15);
  if (longitude > 72 && longitude < 88) {
    offsetHours = 5.5;
  }
  const targetDate = new Date(utcMs + offsetHours * 3600000);
  const rawHours = targetDate.getHours();
  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hrs12 = rawHours % 12 || 12;
  const mins = String(targetDate.getMinutes()).padStart(2, '0');
  return `${hrs12}:${mins} ${period}`;
}

/**
 * Normalizes `src/content/locations.json` into continent groups and flat nodes:
 * - Handles both flat continent arrays (`Asia`, `Europe`, `Africa`, `Oceania`) and nested
 *   subregions (`America` -> `North America`, `South America`, displayed as `Americas`).
 * - Sorts office countries first, then coverage countries alphabetically.
 * - Links every coverage country to its nearest serving office so selecting a coverage country
 *   displays "Served by our [City] office" and draws the live Sonar Cyan supply arc from that office.
 */
function buildNormalizedLocations(): {
  groups: ContinentGroup[];
  allNodes: LocationNode[];
  officeNodes: LocationNode[];
  byId: Map<string, LocationNode>;
} {
  const rawRoot = (locationsData?.worldwide_locations ?? {}) as Record<
    string,
    RawLocationRecord[] | Record<string, RawLocationRecord[]>
  >;

  const defaultPhone =
    siteData?.contact_and_offices?.phones?.[0] ?? '+971 506990095';
  const usPhone =
    siteData?.contact_and_offices?.international_line ??
    siteData?.contact_and_offices?.phones?.[2] ??
    defaultPhone;
  const defaultEmail =
    siteData?.contact_and_offices?.emails?.[0] ?? 'info@globalmarinesupplies.com';

  const preliminaryGroups: {
    continent: string;
    records: { raw: RawLocationRecord; subregion?: string }[];
  }[] = [];

  for (const [continentKey, value] of Object.entries(rawRoot)) {
    const displayContinent = continentKey === 'America' ? 'Americas' : continentKey;

    if (Array.isArray(value)) {
      preliminaryGroups.push({
        continent: displayContinent,
        records: value.map((raw) => ({ raw })),
      });
    } else if (value && typeof value === 'object') {
      const merged: { raw: RawLocationRecord; subregion?: string }[] = [];
      for (const [subKey, subArr] of Object.entries(value)) {
        if (Array.isArray(subArr)) {
          subArr.forEach((raw) => merged.push({ raw, subregion: subKey }));
        }
      }
      preliminaryGroups.push({
        continent: displayContinent,
        records: merged,
      });
    }
  }

  const allNodes: LocationNode[] = [];
  const groups: ContinentGroup[] = [];

  for (const group of preliminaryGroups) {
    // Deduplicate by country name within the same continent
    const seenCountries = new Set<string>();
    const nodes: LocationNode[] = [];

    for (const { raw, subregion } of group.records) {
      if (seenCountries.has(raw.country)) continue;
      seenCountries.add(raw.country);

      const id = slugifyId(group.continent, raw.country);
      const city = PORT_CITIES[raw.country] ?? raw.country;
      const isAmericas = group.continent === 'Americas';

      nodes.push({
        id,
        country: raw.country,
        countryCode: COUNTRY_CODES[raw.country] ?? 'UN',
        continent: group.continent,
        subregion,
        city,
        latitude: raw.latitude,
        longitude: raw.longitude,
        type: raw.type,
        address: raw.address,
        email: raw.email ?? defaultEmail,
        phone: raw.phone ?? (isAmericas ? usPhone : defaultPhone),
      });
    }

    // Sort office countries first, then coverage countries alphabetically (DESIGN.md Section 9)
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'office' ? -1 : 1;
      }
      return a.country.localeCompare(b.country);
    });

    allNodes.push(...nodes);
    groups.push({
      continent: group.continent,
      locations: nodes,
      officeCount: nodes.filter((n) => n.type === 'office').length,
      totalCount: nodes.length,
    });
  }

  const officeNodes = allNodes.filter((n) => n.type === 'office');
  const byId = new Map<string, LocationNode>();
  allNodes.forEach((n) => byId.set(n.id, n));

  // Assign nearest serving office to every coverage country (and fallback hub for offices)
  for (const node of allNodes) {
    let bestOffice: LocationNode | null = null;
    let bestDist = Infinity;

    for (const office of officeNodes) {
      if (office.id === node.id) continue;
      // Prefer offices in the same continent slightly, otherwise closest great-circle distance
      const dist =
        greatCircleDistance(
          node.latitude,
          node.longitude,
          office.latitude,
          office.longitude
        ) * (office.continent === node.continent ? 0.85 : 1);

      if (dist < bestDist) {
        bestDist = dist;
        bestOffice = office;
      }
    }

    if (bestOffice) {
      node.servingOfficeId = bestOffice.id;
      node.servingOfficeCity = bestOffice.city;
      node.servingOfficeCountry = bestOffice.country;
    }
  }

  return { groups, allNodes, officeNodes, byId };
}

export const NETWORK_DATA = buildNormalizedLocations();
