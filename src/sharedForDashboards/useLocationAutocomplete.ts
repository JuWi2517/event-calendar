import { useEffect, useState } from 'react';
import type { LocationSuggestion } from './dashboardTypes';

// ============================================================================
// Hook for Location Autocomplete using Mapy.cz API
// ============================================================================

interface UseLocationAutocompleteResult {
    locationQuery: string;
    setLocationQuery: (query: string) => void;
    locationSuggestions: LocationSuggestion[];
    setLocationSuggestions: (suggestions: LocationSuggestion[]) => void;
    locationError: boolean;
    setLocationError: (error: boolean) => void;
    resetLocationState: () => void;
}

export function useLocationAutocomplete(): UseLocationAutocompleteResult {
    const [locationQuery, setLocationQuery] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
    const [locationError, setLocationError] = useState(false);

    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;

    useEffect(() => {
        const controller = new AbortController();

        async function fetchSuggestions() {
            if (!locationQuery || locationQuery.length < 3) {
                setLocationSuggestions([]);
                return;
            }

            try {
                const requestUrl = `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(locationQuery)}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`;
                const response = await fetch(requestUrl, { signal: controller.signal });
                const data = await response.json();

                if (Array.isArray(data?.items)) {
                    setLocationSuggestions(data.items);
                } else {
                    setLocationSuggestions([]);
                }
            } catch {
                setLocationSuggestions([]);
            }
        }

        void fetchSuggestions();

        return () => controller.abort();
    }, [locationQuery, MAPY_API_KEY]);

    function resetLocationState() {
        setLocationQuery('');
        setLocationSuggestions([]);
        setLocationError(false);
    }

    return {
        locationQuery,
        setLocationQuery,
        locationSuggestions,
        setLocationSuggestions,
        locationError,
        setLocationError,
        resetLocationState,
    };
}