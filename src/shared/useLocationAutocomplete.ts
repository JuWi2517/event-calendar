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
                const locationParams = "&locality=BOX%2813.630415205275739%2C50.282424449893824%2C13.992872427758783%2C50.429883984497934%29%2CBOX%2813.495423078291793%2C50.21301448055726%2C14.175776259835118%2C50.489831390583106%29&preferBBox=13.495423078291793%2C50.21301448055726%2C14.175776259835118%2C50.489831390583106";

                const urlPoi = `https://api.mapy.cz/v1/suggest?lang=cs&apikey=${MAPY_API_KEY}&query=${encodeURIComponent(locationQuery)}&limit=5&type=poi${locationParams}`;

                const urlStreet = `https://api.mapy.cz/v1/suggest?lang=cs&apikey=${MAPY_API_KEY}&query=${encodeURIComponent(locationQuery)}&limit=5&type=regional.street${locationParams}`;

                const urlAddress = `https://api.mapy.cz/v1/suggest?lang=cs&apikey=${MAPY_API_KEY}&query=${encodeURIComponent(locationQuery)}&limit=5&type=regional.address${locationParams}`;

                const [responsePoi, responseAddress, responseStreet] = await Promise.all([
                    fetch(urlPoi, { signal: controller.signal }),
                    fetch(urlAddress, { signal: controller.signal }),
                    fetch(urlStreet, { signal: controller.signal })
                ]);

                const dataPoi = await responsePoi.json();
                const dataAddress = await responseAddress.json();
                const dataStreet = await responseStreet.json();

                const itemsPoi = Array.isArray(dataPoi.items) ? dataPoi.items : [];
                const itemsAddress = Array.isArray(dataAddress.items) ? dataAddress.items : [];
                const itemsStreet = Array.isArray(dataStreet.items) ? dataStreet.items : [];
                const allItems = [...itemsPoi, ...itemsAddress, ...itemsStreet];

                if (allItems.length > 0) {
                    setLocationSuggestions(allItems);
                } else {
                    setLocationSuggestions([]);
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error('Error fetching suggestions:', error);
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