import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Event } from '../types/Event';
import { Clock, MapPin, Tag, Calendar, CoinsIcon } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/CalendarView.css';
import PosterPathFinder from "../components/PosterPathFinder";
import LoadOnScroll from "../components/LoadOnScroll";

registerLocale('cs', cs);

const monthNames = [
    'Leden','Únor','Březen','Duben','Květen','Červen',
    'Červenec','Srpen','Září','Říjen','Listopad','Prosinec'
];

const formatDateRange = (startStr: string, endStr: string | undefined): string => {
    if (!startStr) return 'Datum nespecifikováno';
    const start = new Date(startStr).toLocaleDateString('cs-CZ');
    if (!endStr || startStr === endStr) return start;
    const end = new Date(endStr).toLocaleDateString('cs-CZ');
    return `${start} - ${end}`;
};
const formatMonthYearKey = (key: string): string => {
    const [year, monthNum] = key.split('-');
    const monthIndex = parseInt(monthNum, 10) - 1;
    const currentYear = new Date().getFullYear();

    if (parseInt(year, 10) !== currentYear) {
        return `${monthNames[monthIndex]} ${year}`;
    }
    return monthNames[monthIndex];
};


export default function CalendarView() {
    const [eventsByMonth, setEventsByMonth] = useState<Record<string, Event[]>>({});
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [modalEvent, setModalEvent] = useState<Event | null>(null);

    useEffect(() => {
        (async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayStr = today.toISOString().slice(0, 10);

            const q = query(
                collection(db, 'events'),
                where('status', '==', 'approved'),
                where('endDate', '>=', todayStr),
                orderBy('endDate', 'asc')
            );

            const snap = await getDocs(q);

            const futureEvents: Event[] = snap.docs.map(docSnap => ({
                id: docSnap.id,
                ...(docSnap.data() as Event),
            }));

            const grouped: Record<string, Event[]> = {};
            futureEvents.forEach(ev => {
                const date = new Date(ev.startDate);
                const year = date.getFullYear();
                const monthIdx = date.getMonth();
                const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(ev);
            });

            Object.values(grouped).forEach(arr =>
                arr.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            );

            setEventsByMonth(grouped);
        })();
    }, []);

    const filtered = (arr: Event[] = []) => arr
        .filter(ev => !categoryFilter || ev.category === categoryFilter)
        .filter(ev => {
            if (!monthFilter) return true;
            const m = new Date(ev.startDate).getMonth();
            return monthNames[m] === monthFilter;
        })
        .filter(ev => {
            if (!dateFilter) return true;
            const eventStart = new Date(ev.startDate);
            const eventEnd = new Date(ev.endDate || ev.startDate);
            const filterDate = new Date(dateFilter);
            eventStart.setHours(0, 0, 0, 0);
            eventEnd.setHours(0, 0, 0, 0);
            filterDate.setHours(0, 0, 0, 0);
            return filterDate >= eventStart && filterDate <= eventEnd;
        });

    const sortedMonthKeys = Object.keys(eventsByMonth).sort();

    let openToMonth: Date | undefined = undefined;
    if (monthFilter) {
        const monthIndex = monthNames.indexOf(monthFilter);
        if (monthIndex > -1) {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonthIndex = today.getMonth();
            const targetYear = monthIndex < currentMonthIndex
                ? currentYear + 1
                : currentYear;
            openToMonth = new Date(targetYear, monthIndex, 1);
        }
    }

    return (
        <div className="calendar-view">
            <div className="cv-container">
                <div className="filter-bar">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="">Všechny kategorie</option>
                        <option value="koncert">Koncerty</option>
                        <option value="sport">Sport</option>
                        <option value="pro děti">Pro děti</option>
                        <option value="divadlo">Divadlo</option>
                        <option value="kino">Kino</option>
                        <option value="výstava">Výstavy</option>
                        <option value="přednáška">Přednášky</option>
                        <option value="slavnost">Slavnosti</option>
                    </select>

                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                        <option value="">Všechny měsíce</option>
                        {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <ReactDatePicker
                        locale="cs"
                        selected={dateFilter}
                        onChange={(d) => setDateFilter(d)}
                        placeholderText="Filtrovat podle dne"
                        dateFormat="d. MMMM yyyy"
                        isClearable
                        onFocus={(e) => e.target.blur()}
                        onKeyDown={(e) => e.preventDefault()}
                        openToDate={openToMonth}
                    />
                </div>

                {sortedMonthKeys.map(monthKey => {
                    const list = filtered(eventsByMonth[monthKey]);
                    if (!list || list.length === 0) return null;
                    return (
                        <LoadOnScroll
                            key={monthKey}
                            fallback={
                                <div className="month-group-placeholder">
                                    <h2>{formatMonthYearKey(monthKey)}</h2>
                                    <div className="events-grid-placeholder" />
                                </div>
                            }
                        >
                            <div className="month-group">
                                <h2>{formatMonthYearKey(monthKey)}</h2>
                                <div className="events-grid">
                                    {list.map(ev => (
                                        <div key={ev.id} className="event-card" onClick={() => setModalEvent(ev)}>
                                            <div className="event-header">


                                                <PosterPathFinder
                                                    path={ev.resizedPosterPath}
                                                    fallbackPath={ev.posterPath}
                                                    alt={ev.title}
                                                    className="poster"
                                                    loading="lazy"
                                                />
                                                <h3>{ev.title}</h3>
                                            </div>
                                            <div className="event-meta">
                                                <p><Calendar size={16} /> {formatDateRange(ev.startDate, ev.endDate)}</p>
                                                <p><Clock size={16} /> {ev.start}</p>
                                                <p><MapPin size={16} /> {ev.location}</p>
                                                {ev.price && <p><CoinsIcon size={16} /> {ev.price} Kč</p>}
                                                {ev.category && <p><Tag size={16} /> {ev.category}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </LoadOnScroll>
                    );
                })}

                {modalEvent && (
                    <div className="modal-backdrop" onClick={() => setModalEvent(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>

                            <PosterPathFinder
                                path={modalEvent.posterPath}
                                fallbackPath={modalEvent.posterPath}
                                alt={modalEvent.title}
                                className="modal-poster"
                                loading="eager"
                            />

                            <h2>{modalEvent.title}</h2>
                            <p><Calendar size={16} /> Datum: {formatDateRange(modalEvent.startDate, modalEvent.endDate)}</p>
                            <p><Clock size={16} /> Začátek: {modalEvent.start}</p>

                            {modalEvent.lat && modalEvent.lng ? (
                                <p>
                                    <MapPin size={16} /> Místo:{" "}
                                    <a
                                        href={`https://mapy.cz/s/${modalEvent.lat},${modalEvent.lng}`} // Použijeme Mapy.cz
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Zobrazit na mapě"
                                    >
                                        {modalEvent.location}
                                    </a>
                                </p>
                            ) : (
                                <p><MapPin size={16} /> Místo: {modalEvent.location}</p>
                            )}

                            {modalEvent.price && <p><CoinsIcon size={16} /> {modalEvent.price} Kč</p>}
                            {modalEvent.category && <p><Tag size={16} /> {modalEvent.category}</p>}
                            {modalEvent.facebookUrl && (
                                <p><a href={modalEvent.facebookUrl} target="_blank" rel="noreferrer">Odkaz na událost</a></p>
                            )}
                            <button onClick={() => setModalEvent(null)} className="close-button">Zavřít</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};