/**
 * Google Maps URL builders.
 * Pure URL construction — no Maps JavaScript API, no embeds, no location permissions.
 * Links open in a new tab; user manually enters their location in Maps.
 */

/**
 * Build a Google Maps search URL.
 * Example: buildMapsSearchUrl("farmers market") →
 *   "https://www.google.com/maps/search/?api=1&query=farmers+market"
 */
export function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type TravelMode = 'transit' | 'bicycling' | 'walking';

/**
 * Build a Google Maps directions URL with a specific travel mode.
 * Destination-only; user enters origin in Maps.
 *
 * Example: buildMapsDirectionsUrl("city center", "transit") →
 *   "https://www.google.com/maps/dir/?api=1&destination=city+center&travelmode=transit"
 */
export function buildMapsDirectionsUrl(destination: string, travelMode: TravelMode): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${travelMode}`;
}
