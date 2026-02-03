import type { Event } from '../types/Event';

// ============================================================================
// Shared Types for Dashboard Components
// ============================================================================

export type EventWithId = Event & { id: string };

export type CollectionType = 'submissions' | 'events';

export interface DatePickerInputProps {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    className?: string;
}

export interface LocationSuggestion {
    name: string;
    label?: string;
    position?: {
        lat: number;
        lon: number;
    };
}

export type EventWithPosterPath = Event & {
    posterPath?: string;
    resizedPosterPath?: string;
};