import { useEffect, useState, forwardRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Event } from '../types/Event';
import { Clock, MapPin, Tag, Calendar, CoinsIcon, User } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/CalendarView.css';
import PosterPathFinder from '../components/PosterPathFinder';
import LoadOnScroll from '../components/LoadOnScroll';

// Shared imports
import { CATEGORY_OPTIONS } from '../shared';

registerLocale('cs', cs);

// ============================================================================
// Types
// ============================================================================

interface DatePickerInputProps {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    className?: string;
}

type EventsByMonth = Record<string, Event[]>;

// ============================================================================
// Constants
// ============================================================================

const MONTH_NAMES = [
    'Leden',
    'Únor',
    'Březen',
    'Duben',
    'Květen',
    'Červen',
    'Červenec',
    'Srpen',
    'Září',
    'Říjen',
    'Listopad',
    'Prosinec',
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateRange(startStr: string, endStr: string | undefined): string {
    if (!startStr) {
        return 'Datum nespecifikováno';
    }

    const startDate = new Date(startStr);
    const formattedStart = startDate.toLocaleDateString('cs-CZ');

    if (!endStr || startStr === endStr) {
        return formattedStart;
    }

    const endDate = new Date(endStr);
    const formattedEnd = endDate.toLocaleDateString('cs-CZ');

    return `${formattedStart} - ${formattedEnd}`;
}

function formatTimeRange(start: string, end: string | undefined): string {
    if (!end) {
        return start;
    }
    return `${start} - ${end}`;
}

function formatMonthYearKey(key: string): string {
    const [year, monthNum] = key.split('-');
    const monthIndex = parseInt(monthNum, 10) - 1;
    const currentYear = new Date().getFullYear();

    // Only show year if it's different from current year
    if (parseInt(year, 10) !== currentYear) {
        return `${MONTH_NAMES[monthIndex]} ${year}`;
    }

    return MONTH_NAMES[monthIndex];
}

function createMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
}

function groupEventsByMonth(events: Event[]): EventsByMonth {
    const grouped: EventsByMonth = {};

    events.forEach((event) => {
        const date = new Date(event.startDate);
        const key = createMonthKey(date);

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push(event);
    });

    // Sort events within each month by start date
    Object.values(grouped).forEach((monthEvents) => {
        monthEvents.sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return dateA - dateB;
        });
    });

    return grouped;
}

function isDateInEventRange(
    filterDate: Date,
    eventStartStr: string,
    eventEndStr: string | undefined
): boolean {
    const eventStart = new Date(eventStartStr);
    const eventEnd = new Date(eventEndStr || eventStartStr);
    const normalizedFilter = new Date(filterDate);

    // Normalize all dates to midnight for comparison
    eventStart.setHours(0, 0, 0, 0);
    eventEnd.setHours(0, 0, 0, 0);
    normalizedFilter.setHours(0, 0, 0, 0);

    return normalizedFilter >= eventStart && normalizedFilter <= eventEnd;
}

// ============================================================================
// Components
// ============================================================================

const DatePickerCustomInput = forwardRef<HTMLButtonElement, DatePickerInputProps>(
    function DatePickerCustomInput({ value, onClick, placeholder }, ref) {
        return (
            <button
                className="react-datepicker-button"
                onClick={onClick}
                ref={ref}
                type="button"
            >
                {value || placeholder}
            </button>
        );
    }
);

// ============================================================================
// Main Component
// ============================================================================

export default function CalendarView() {
    // Data state
    const [eventsByMonth, setEventsByMonth] = useState<EventsByMonth>({});

    // Filter state
    const [categoryFilter, setCategoryFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);

    // Modal state
    const [modalEvent, setModalEvent] = useState<Event | null>(null);

    // ========================================================================
    // Data Loading
    // ========================================================================

    useEffect(() => {
        async function loadEvents() {
            // Get today's date at midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().slice(0, 10);

            // Query for approved events that haven't ended yet
            const eventsQuery = query(
                collection(db, 'events'),
                where('status', '==', 'approved'),
                where('endDate', '>=', todayStr),
                orderBy('endDate', 'asc')
            );

            const snapshot = await getDocs(eventsQuery);

            const events: Event[] = snapshot.docs.map((document) => ({
                id: document.id,
                ...(document.data() as Event),
            }));

            const grouped = groupEventsByMonth(events);
            setEventsByMonth(grouped);
        }

        void loadEvents();
    }, []);

    // ========================================================================
    // Filtering
    // ========================================================================

    function filterEvents(events: Event[]): Event[] {
        return events
            .filter((event) => {
                // Category filter
                if (categoryFilter && event.category !== categoryFilter) {
                    return false;
                }
                return true;
            })
            .filter((event) => {
                // Month filter
                if (!monthFilter) {
                    return true;
                }
                const eventMonth = new Date(event.startDate).getMonth();
                return MONTH_NAMES[eventMonth] === monthFilter;
            })
            .filter((event) => {
                // Date filter
                if (!dateFilter) {
                    return true;
                }
                return isDateInEventRange(dateFilter, event.startDate, event.endDate);
            });
    }

    // Calculate which month to open the date picker to
    function getOpenToMonth(): Date | undefined {
        if (!monthFilter) {
            return undefined;
        }

        const monthIndex = MONTH_NAMES.indexOf(monthFilter);
        if (monthIndex === -1) {
            return undefined;
        }

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // If selected month is before current month, assume next year
        const targetYear = monthIndex < currentMonth ? currentYear + 1 : currentYear;

        return new Date(targetYear, monthIndex, 1);
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    function handleCategoryChange(event: React.ChangeEvent<HTMLSelectElement>) {
        setCategoryFilter(event.target.value);
    }

    function handleMonthChange(event: React.ChangeEvent<HTMLSelectElement>) {
        setMonthFilter(event.target.value);
    }

    function handleDateChange(date: Date | null) {
        setDateFilter(date);
    }

    function handleEventClick(event: Event) {
        setModalEvent(event);
    }

    function handleModalClose() {
        setModalEvent(null);
    }

    function handleModalBackdropClick() {
        setModalEvent(null);
    }

    function handleModalContentClick(clickEvent: React.MouseEvent) {
        clickEvent.stopPropagation();
    }

    // ========================================================================
    // Render Helpers
    // ========================================================================

    function renderFilterBar() {
        return (
            <div className="filter-bar">
                {/* Category Filter */}
                <select value={categoryFilter} onChange={handleCategoryChange}>
                    {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Month Filter */}
                <select value={monthFilter} onChange={handleMonthChange}>
                    <option value="">Všechny měsíce</option>
                    {MONTH_NAMES.map((month) => (
                        <option key={month} value={month}>
                            {month}
                        </option>
                    ))}
                </select>

                {/* Date Filter */}
                <ReactDatePicker
                    locale="cs"
                    selected={dateFilter}
                    onChange={handleDateChange}
                    placeholderText="Filtrovat podle dne"
                    dateFormat="d. MMMM yyyy"
                    isClearable
                    openToDate={getOpenToMonth()}
                    customInput={
                        <DatePickerCustomInput className="react-datepicker-button" />
                    }
                />
            </div>
        );
    }

    function renderEventCard(event: Event) {
        function handleClick() {
            handleEventClick(event);
        }

        return (
            <div key={event.id} className="event-card" onClick={handleClick}>
                <div className="event-header">
                    <PosterPathFinder
                        path={event.resizedPosterPath}
                        fallbackPath={event.posterPath}
                        alt={event.title}
                        className="poster"
                        loading="lazy"
                    />
                    <h3>{event.title}</h3>
                </div>

                <div className="event-meta">
                    <p>
                        <Calendar size={16} />
                        {formatDateRange(event.startDate, event.endDate)}
                    </p>

                    <p>
                        <Clock size={16} />
                        {formatTimeRange(event.start, event.end)}
                    </p>

                    <p>
                        <MapPin size={16} />
                        {event.location}
                    </p>

                    <p>
                        <CoinsIcon size={16} />
                        {event.price ? `${event.price} Kč` : 'Dobrovolné'}
                    </p>

                    {event.category && (
                        <p>
                            <Tag size={16} />
                            {event.category}
                        </p>
                    )}
                </div>

                {event.organizer && (
                    <div className="event-organizer">
                        <User size={14} />
                        <span>{event.organizer}</span>
                    </div>
                )}
            </div>
        );
    }

    function renderMonthGroup(monthKey: string) {
        const monthEvents = eventsByMonth[monthKey];
        const filteredEvents = filterEvents(monthEvents || []);

        if (filteredEvents.length === 0) {
            return null;
        }

        const placeholder = (
            <div className="month-group-placeholder">
                <h2>{formatMonthYearKey(monthKey)}</h2>
                <div className="events-grid-placeholder" />
            </div>
        );

        return (
            <LoadOnScroll key={monthKey} fallback={placeholder}>
                <div className="month-group">
                    <h2>{formatMonthYearKey(monthKey)}</h2>
                    <div className="events-grid">
                        {filteredEvents.map((event) => renderEventCard(event))}
                    </div>
                </div>
            </LoadOnScroll>
        );
    }

    function renderLocationLink(event: Event) {
        const hasCoordinates = event.lat && event.lng;

        if (hasCoordinates) {
            const mapUrl = `https://mapy.com/zakladni?q=${event.lat},${event.lng}`;

            return (
                <p>
                    <MapPin size={16} /> Místo:{' '}
                    <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Zobrazit na mapě"
                    >
                        {event.location}
                    </a>
                </p>
            );
        }

        return (
            <p>
                <MapPin size={16} /> Místo: {event.location}
            </p>
        );
    }

    function renderModal() {
        if (!modalEvent) {
            return null;
        }

        return (
            <div className="modal-backdrop" onClick={handleModalBackdropClick}>
                <div className="modal" onClick={handleModalContentClick}>
                    <PosterPathFinder
                        path={modalEvent.posterPath}
                        fallbackPath={modalEvent.posterPath}
                        alt={modalEvent.title}
                        className="modal-poster"
                        loading="eager"
                    />

                    <h2>{modalEvent.title}</h2>

                    <p>
                        <Calendar size={16} /> Datum:{' '}
                        {formatDateRange(modalEvent.startDate, modalEvent.endDate)}
                    </p>

                    <p>
                        <Clock size={16} /> Čas: {formatTimeRange(modalEvent.start, modalEvent.end)}
                    </p>

                    {renderLocationLink(modalEvent)}

                    <p>
                        <CoinsIcon size={16} /> {modalEvent.price ? `${modalEvent.price} Kč` : 'Dobrovolné'}
                    </p>

                    {modalEvent.category && (
                        <p>
                            <Tag size={16} /> {modalEvent.category}
                        </p>
                    )}

                    {modalEvent.organizer && (
                        <p>
                            <User size={16} /> Pořadatel: {modalEvent.organizer}
                        </p>
                    )}

                    {modalEvent.facebookUrl && (
                        <p>
                            <a
                                href={modalEvent.facebookUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Odkaz na událost
                            </a>
                        </p>
                    )}

                    <button onClick={handleModalClose} className="close-button">
                        Zavřít
                    </button>
                </div>
            </div>
        );
    }

    // ========================================================================
    // Main Render
    // ========================================================================

    const sortedMonthKeys = Object.keys(eventsByMonth).sort();

    return (
        <div className="calendar-view">
            <div className="cv-container">
                {renderFilterBar()}

                {sortedMonthKeys.map((monthKey) => renderMonthGroup(monthKey))}

                {renderModal()}
            </div>
        </div>
    );
}