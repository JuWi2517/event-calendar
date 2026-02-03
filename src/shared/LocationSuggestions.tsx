import { useRef } from 'react';
import type { LocationSuggestion } from './dashboardTypes';
import MapyLogo from '../assets/Photos/imageedit_1_2894183964.webp';

// ============================================================================
// Location Suggestions Dropdown
// ============================================================================

interface LocationSuggestionsProps {
    suggestions: LocationSuggestion[];
    onSelect: (item: LocationSuggestion) => void;
}

export function LocationSuggestions({ suggestions, onSelect }: LocationSuggestionsProps) {
    const suggestionsRef = useRef<HTMLUListElement>(null);

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <ul className="suggestions" ref={suggestionsRef}>
            {suggestions.map((item, index) => {
                function handleSuggestionClick() {
                    onSelect(item);
                }

                const displayName = item.name.split('(')[0].trim();

                return (
                    <li key={index} onClick={handleSuggestionClick}>
                        {displayName}
                        {item.label && (
                            <small style={{ marginLeft: 8, color: '#999' }}>
                                ({item.label})
                            </small>
                        )}
                    </li>
                );
            })}

            <li
                style={{
                    padding: '8px 12px',
                    textAlign: 'right',
                    cursor: 'default',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}
            >
                <a
                    href="https://mapy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                    }}
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                >
                    <span style={{ fontSize: '0.8em', color: '#555' }}>Powered by</span>
                    <img
                        src={MapyLogo}
                        alt="Mapy.com logo"
                        style={{ height: '15px', width: 'auto', verticalAlign: 'middle' }}
                    />
                </a>
            </li>
        </ul>
    );
}