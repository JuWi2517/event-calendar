import type { Event } from '../types/Event';
import type { EventWithPosterPath } from './dashboardTypes';
import { FB_RESOLVER_ENDPOINT } from './dashboardConstants';

// ============================================================================
// Date Helpers
// ============================================================================

export function toLocalDateString(date: Date | null): string {
    if (!date) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string | undefined): string {
    if (!dateStr) {
        return '';
    }

    const parts = dateStr.split('-');

    if (parts.length !== 3) {
        return dateStr;
    }

    const [year, month, day] = parts;
    return `${day}. ${month}. ${year}`;
}

// ============================================================================
// Image Helpers
// ============================================================================

export function getResizedImagePath(originalPath: string): string {
    if (!originalPath) {
        return '';
    }

    const suffix = '_640x853.webp';
    const lastDotIndex = originalPath.lastIndexOf('.');

    if (lastDotIndex === -1) {
        return `${originalPath}${suffix}`;
    }

    const pathWithoutExtension = originalPath.substring(0, lastDotIndex);
    return `${pathWithoutExtension}${suffix}`;
}

export function extractPosterPath(event: Partial<EventWithPosterPath>): string | undefined {
    // Try posterPath first
    if (event.posterPath) {
        return event.posterPath;
    }

    // Try to extract from posterUrl
    if (event.posterUrl) {
        try {
            const url = new URL(event.posterUrl);
            const encoded = url.pathname.split('/o/')[1];

            if (encoded) {
                return decodeURIComponent(encoded);
            }
        } catch {
            // Invalid URL, return undefined
        }
    }

    return undefined;
}

// ============================================================================
// Facebook URL Helper
// ============================================================================

export async function normalizeFacebookUrl(rawUrl: string): Promise<string> {
    const trimmedUrl = (rawUrl || '').trim();

    if (!trimmedUrl) {
        return '';
    }

    // Check for direct Facebook event URL
    const directMatch = trimmedUrl.match(/facebook\.com\/events\/(\d+)/);
    if (directMatch) {
        const eventId = directMatch[1];
        return `https://www.facebook.com/events/${eventId}/`;
    }

    // Resolve fb.me short links
    if (trimmedUrl.includes('fb.me')) {
        try {
            const requestUrl = `${FB_RESOLVER_ENDPOINT}?url=${encodeURIComponent(trimmedUrl)}`;
            const response = await fetch(requestUrl);

            if (!response.ok) {
                return trimmedUrl;
            }

            const data = await response.json();

            if (data?.resolved) {
                return String(data.resolved);
            }
        } catch {
            // Fall through to return original URL
        }
    }

    return trimmedUrl;
}

// ============================================================================
// Validation Helper
// ============================================================================

export function validateEventFields(event: Partial<Event>): string[] {
    const missingFields: string[] = [];

    if (!event.title?.trim()) {
        missingFields.push('Název');
    }

    if (!event.location?.trim()) {
        missingFields.push('Místo');
    }

    if (!event.startDate) {
        missingFields.push('Datum');
    }

    return missingFields;
}