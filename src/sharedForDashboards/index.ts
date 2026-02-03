// ============================================================================
// Shared Dashboard Module Exports
// ============================================================================

// Types
export type {
    EventWithId,
    CollectionType,
    DatePickerInputProps,
    LocationSuggestion,
    EventWithPosterPath,
} from './dashboardTypes';

// Constants
export { FB_RESOLVER_ENDPOINT, CATEGORY_OPTIONS } from './dashboardConstants';

// Helper Functions
export {
    toLocalDateString,
    formatDisplayDate,
    getResizedImagePath,
    extractPosterPath,
    normalizeFacebookUrl,
    validateEventFields,
} from './dashboardHelpers';

// Components
export { DatePickerCustomInput } from './DatePickerCustomInput';
export { LocationSuggestions } from './LocationSuggestions';
export {
    IconCalendar,
    IconClock,
    IconMapPin,
    IconPrice,
    IconTag,
} from './Icons';

// Hooks
export { useLocationAutocomplete } from './useLocationAutocomplete.ts';