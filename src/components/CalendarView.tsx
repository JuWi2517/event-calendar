import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
import { ref as storageRef, getStorage, deleteObject } from 'firebase/storage';
import { db } from '../firebase';
import type { Event } from '../types/Event';
import { Clock, MapPin, Tag, Calendar, CoinsIcon } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import cs from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/CalendarView.css';

registerLocale('cs', cs);

const monthNames = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

export default function CalendarView() {
    const [eventsByMonth, setEventsByMonth] = useState<Record<string, Event[]>>({});
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [modalEvent, setModalEvent] = useState<Event | null>(null);

    useEffect(() => {
        (async () => {
            const today = new Date();
            const q = query(collection(db, 'events'), where('status', '==', 'approved'));
            const snap = await getDocs(q);
            const storage = getStorage();
            const futureEvents: Event[] = [];

            for (const docSnap of snap.docs) {
                const data = docSnap.data() as Event;
                const eventDate = new Date(data.date);

                if (eventDate < today) {
                    await deleteDoc(firestoreDoc(db, 'events', docSnap.id));
                    if (data.posterUrl) {
                        const imgRef = storageRef(storage, data.posterUrl);
                        await deleteObject(imgRef).catch(() => {});
                    }
                    continue;
                }
                futureEvents.push({ id: docSnap.id, ...data });
            }

            const grouped: Record<string, Event[]> = {};
            futureEvents.forEach(ev => {
                const monthIdx = new Date(ev.date).getMonth();
                const key = monthNames[monthIdx];
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(ev);
            });
            Object.values(grouped).forEach(arr =>
                arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            );

            setEventsByMonth(grouped);
        })();
    }, []);

    const matchesDate = (ev: Event) => {
        if (!dateFilter) return true;
        const evDate = new Date(ev.date);
        return evDate.toDateString() === dateFilter.toDateString();
    };

    return (
        <div className="calendar-view">
            <div className="cv-container">
                <div className="filter-bar">
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                        <option value="">Všechny kategorie</option>
                        <option value="kultura">Kultura</option>
                        <option value="sport">Sport</option>
                        <option value="vzdělávání">Vzdělávání</option>
                    </select>
                    <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="month-filter">
                        <option value="">Všechny měsíce</option>
                        {monthNames.map((m, i) => (
                            <option key={i} value={(i + 1).toString()}>{m}</option>
                        ))}
                    </select>
                    <div className="date-filter-wrapper">
                        <ReactDatePicker
                            selected={dateFilter}
                            onChange={date => setDateFilter(date)}
                            locale="cs"
                            dateFormat="dd.MM.yyyy"
                            placeholderText="Vyberte datum"
                            id="dateFilter"
                            className="date-filter"
                            isClearable
                        />
                    </div>
                </div>

                {Object.entries(eventsByMonth)
                    .filter(([month]) => {
                        if (!monthFilter) return true;
                        const idx = monthNames.indexOf(month) + 1;
                        return idx === parseInt(monthFilter, 10);
                    })
                    .map(([month, events]) => (
                        <div key={month} className="month-section">
                            <h2 className="month-title">{month}</h2>
                            <div className="grid">
                                {events
                                    .filter(ev => (categoryFilter ? ev.category === categoryFilter : true))
                                    .filter(matchesDate)
                                    .map(ev => (
                                        <div key={ev.id} className="card" onClick={() => setModalEvent(ev)}>
                                            {ev.posterUrl && <img src={ev.posterUrl} alt="" className="poster" />}
                                            <div className="info">
                                                <div className="info-box">
                                                    <h3 className="title">{ev.title}</h3>
                                                    <div className="icon-row"><Calendar size={16} /><span>{ev.date}</span></div>
                                                    <div className="icon-row"><Clock size={16} /><span>{ev.start}</span></div>
                                                    <div className="icon-row"><MapPin size={16} /><span>{ev.location}</span></div>
                                                    <div className="icon-row"><CoinsIcon size={16} /><span>{ev.price} Kč</span></div>
                                                    <div className="icon-row"><Tag size={16} /><span>{ev.category}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}

                {modalEvent && (
                    <div className="modal-bg" onClick={() => setModalEvent(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            {modalEvent.posterUrl && <img src={modalEvent.posterUrl} alt="" className="modal-poster" />}
                            <h2>{modalEvent.title}</h2>
                            <p><Calendar size={16} /> Datum: {modalEvent.date}</p>
                            <p><Clock size={16} /> Začátek: {modalEvent.start}</p>
                            <p><MapPin size={16} /> Místo:
                                <a
                                    href={`https://mapy.cz/zakladni?x=${modalEvent.lng}&y=${modalEvent.lat}&z=17&marker=${modalEvent.lng},${modalEvent.lat}`}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    style={{ color: 'blue', textDecoration: 'underline', marginLeft: '0.5rem' }}
                                >
                                    {modalEvent.location}
                                </a>
                            </p>
                            {modalEvent.facebookUrl && (
                                <p>
                                    <a href={modalEvent.facebookUrl} target="_blank" rel="noreferrer">
                                        Odkaz na Facebook událost
                                    </a>
                                </p>
                            )}
                            <button onClick={() => setModalEvent(null)} className="close-button">Zavřít</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
