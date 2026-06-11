import { describe, it, expect } from 'vitest';
import { buildMapsSearchUrl, buildMapsDirectionsUrl } from '../maps-urls';

describe('Google Maps URL Builders', () => {
  describe('buildMapsSearchUrl', () => {
    it('builds a valid search URL', () => {
      const url = buildMapsSearchUrl('farmers market');
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=farmers%20market');
    });

    it('encodes special characters', () => {
      const url = buildMapsSearchUrl('café & restaurant');
      expect(url).toContain('caf%C3%A9');
      expect(url).toContain('%26');
    });

    it('encodes plus signs', () => {
      const url = buildMapsSearchUrl('bike+shop');
      expect(url).toContain('bike%2Bshop');
    });

    it('handles empty query', () => {
      const url = buildMapsSearchUrl('');
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=');
    });

    it('does not embed any location data', () => {
      const url = buildMapsSearchUrl('transit stops');
      expect(url).not.toContain('origin');
      expect(url).not.toContain('location');
      expect(url).not.toContain('latlng');
    });
  });

  describe('buildMapsDirectionsUrl', () => {
    it('builds a transit directions URL', () => {
      const url = buildMapsDirectionsUrl('city center', 'transit');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=city%20center&travelmode=transit',
      );
    });

    it('builds a bicycling directions URL', () => {
      const url = buildMapsDirectionsUrl('park', 'bicycling');
      expect(url).toContain('travelmode=bicycling');
    });

    it('builds a walking directions URL', () => {
      const url = buildMapsDirectionsUrl('office', 'walking');
      expect(url).toContain('travelmode=walking');
    });

    it('encodes destination with special characters', () => {
      const url = buildMapsDirectionsUrl("St. Paul's Cathedral", 'transit');
      expect(url).toContain("St.%20Paul's%20Cathedral");
    });

    it('does not include origin (user enters manually)', () => {
      const url = buildMapsDirectionsUrl('destination', 'transit');
      expect(url).not.toContain('origin=');
    });

    it('does not embed any location or API key', () => {
      const url = buildMapsDirectionsUrl('place', 'walking');
      expect(url).not.toContain('key=');
      expect(url).not.toContain('latlng');
    });
  });
});
