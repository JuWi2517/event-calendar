import { useEffect, useRef, useState } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Event } from '../types/Event';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/AdminDashboard.css';
import EventForm from './EventForm';

registerLocale('cs', cs);

// --- NEW HELPER FUNCTION (copied from EventForm) ---
// Converts a Date object to a 'YYYY-MM-DD' string, ignoring timezones
const toLocalDateString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type WithId<T> = T & { id: string };

// --- 1. FACEBOOK URL NORMALIZER FUNCTION (FROM PREVIOUS STEP) ---
const FB_RESOLVER_ENDPOINT = 'https://us-central1-culture-calendar-4747b.cloudfunctions.net/api/resolve-link';

async function normalizeFacebookUrl(rawUrl: string): Promise<string> {
    const trimmedUrl = (rawUrl || '').trim();
    if (!trimmedUrl) return '';

    const directMatch = trimmedUrl.match(/facebook\.com\/events\/(\d+)/);
    if (directMatch) {
        return `https://www.facebook.com/events/${directMatch[1]}/`;
    }

    if (trimmedUrl.includes('fb.me')) {
        try {
            const response = await fetch(`${FB_RESOLVER_ENDPOINT}?url=${encodeURIComponent(trimmedUrl)}`);
            if (!response.ok) return trimmedUrl;
            const data = await response.json();
            if (data?.resolved) return String(data.resolved);
            return trimmedUrl;
        } catch {
            return trimmedUrl;
        }
    }
    return trimmedUrl;
}

export default function AdminDashboard() {
    const [pending, setPending] = useState<WithId<Event>[]>([]);
    const [approved, setApproved] = useState<WithId<Event>[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editedEvent, setEditedEvent] = useState<WithId<Event> | null>(null);
    const [editedCollection, setEditedCollection] = useState<'submissions' | 'events' | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);

    // --- NEW: STATE FOR FULLSCREEN IMAGE VIEWER ---
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

    const [locQuery, setLocQuery] = useState('');
    const [locSuggestions, setLocSuggestions] = useState<string[]>([]);
    const suggRef = useRef<HTMLUListElement>(null);
    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;

    useEffect(() => {
        (async () => {
            const subSnap = await getDocs(collection(db, 'submissions'));
            const subs = subSnap.docs.map(d => ({ id: d.id, ...(d.data() as Event) }));
            setPending(subs);

            const evtSnap = await getDocs(collection(db, 'events'));
            const evts = evtSnap.docs.map(d => ({ id: d.id, ...(d.data() as Event) }));
            setApproved(evts);
        })();
    }, []);

    useEffect(() => {
        const ctl = new AbortController();
        (async () => {
            if (!locQuery || locQuery.length < 3) {
                setLocSuggestions([]);
                return;
            }
            try {
                const resp = await fetch(
                    `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(
                        locQuery
                    )}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`,
                    { signal: ctl.signal }
                );
                const data = await resp.json();
                if (Array.isArray(data?.items)) {
                    setLocSuggestions(data.items.map((it: any) => it.name));
                } else {
                    setLocSuggestions([]);
                }
            } catch {
                setLocSuggestions([]);
            }
        })();
        return () => ctl.abort();
    }, [locQuery, MAPY_API_KEY]);

    const openEdit = (item: WithId<Event>, from: 'submissions' | 'events') => {
        setEditedEvent(item);
        setEditedCollection(from);
        setNewImage(null);
        setModalOpen(true);
        setLocQuery('');
        setLocSuggestions([]);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditedEvent(null);
        setEditedCollection(null);
        setNewImage(null);
        setLocQuery('');
        setLocSuggestions([]);
    };

    const approve = async (id: string) => {
        const item = pending.find(x => x.id === id);
        if (!item) return;
        if (!confirm('Schválit a přesunout do „events“?')) return;

        const { id: _drop, ...payload } = item;
        await addDoc(collection(db, 'events'), { ...payload, status: 'approved' });
        await deleteDoc(doc(db, 'submissions', id));

        setPending(p => p.filter(x => x.id !== id));
        setApproved(a => [{ ...item, status: 'approved' }, ...a]);
    };

    const unapprove = async (id: string) => {
        const item = approved.find(x => x.id === id);
        if (!item) return;
        if (!confirm('Vrátit ze „events“ zpět do „submissions“?')) return;

        const { id: _drop, ...payload } = item;
        await addDoc(collection(db, 'submissions'), { ...payload, status: 'pending' });
        await deleteDoc(doc(db, 'events', id));

        setApproved(a => a.filter(x => x.id !== id));
        setPending(p => [{ ...item, status: 'pending' }, ...p]);
    };

    const deletePosterIfAny = async (obj: Partial<Event>) => {
        try {
            const path = (obj as any)?.posterPath as string | undefined;
            if (path) {
                await deleteObject(ref(storage, path));
                return;
            }
            if (obj.posterUrl) {
                const u = new URL(obj.posterUrl);
                const encoded = u.pathname.split('/o/')[1];
                if (encoded) {
                    const fullPath = decodeURIComponent(encoded);
                    await deleteObject(ref(storage, fullPath));
                }
            }
        } catch {}
    };

    const removeCard = async (id: string, from: 'submissions' | 'events') => {
        const list = from === 'submissions' ? pending : approved;
        const itm = list.find(x => x.id === id);
        if (!itm) return;

        if (!confirm('Opravdu smazat?')) return;

        try {
            await deleteDoc(doc(db, from, id));

            try { await deletePosterIfAny(itm); } catch (e) {
                console.warn('Plakát se nepodařilo smazat:', e);
            }

            if (from === 'submissions') {
                setPending(p => p.filter(x => x.id !== id));
            } else {
                setApproved(a => a.filter(x => x.id !== id));
            }
        } catch (e: any) {
            console.error('Mazání dokumentu selhalo:', e);
            alert('Mazání selhalo: ' + (e?.message ?? e));
        }
    };

    const saveChanges = async () => {
        if (!editedEvent || !editedCollection) return;
        const copy: WithId<Event> = { ...editedEvent };

        // --- NORMALIZE FACEBOOK URL BEFORE SAVING ---
        copy.facebookUrl = await normalizeFacebookUrl(copy.facebookUrl || '');

        if (newImage) {
            await deletePosterIfAny(copy);
            const newPath = `posters/${Date.now()}_${newImage.name}`;
            const newRef = ref(storage, newPath);
            await uploadBytes(newRef, newImage);
            copy.posterUrl = await getDownloadURL(newRef);
            (copy as any).posterPath = newPath;
        }

        const { id, ...payload } = copy;
        await updateDoc(doc(db, editedCollection, id), payload);

        if (editedCollection === 'submissions') {
            setPending(p => p.map(x => (x.id === id ? copy : x)));
        } else {
            setApproved(a => a.map(x => (x.id === id ? copy : x)));
        }

        closeModal();
    };

    const setField = <K extends keyof Event>(key: K, val: Event[K]) => {
        setEditedEvent(prev => (prev ? ({ ...prev, [key]: val } as WithId<Event>) : prev));
    };

    // --- NEW: Handler for the modal's date range picker ---
    const handleModalDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setEditedEvent(prev => (prev ? ({
            ...prev,
            startDate: toLocalDateString(start), // Convert Date to YYYY-MM-DD
            endDate: toLocalDateString(end),   // Convert Date to YYYY-MM-DD
        } as WithId<Event>) : prev));
    };

    return (
        <div className="admin-page">
            <h2 className="admin-title">Správa událostí</h2>

            {/* Sections for pending and approved events... (code remains the same) */}
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Neschválené návrhy</h3>
                    <span className="pill">{pending.length}</span>
                </div>
                <div className="cards-grid">
                    {pending.map(s => (
                        <article
                            key={s.id}
                            className="card"
                            onClick={() => openEdit(s, 'submissions')}
                            title="Upravit"
                        >
                            {s.posterUrl && <img src={s.posterUrl} alt="" className="card-poster" />}
                            <div className="card-body">
                                <h4 className="card-title">{s.title || 'Bez názvu'}</h4>
                                <div className="meta">
                                    {/* --- FIXED: .date -> .startDate --- */}
                                    <span>{s.startDate}</span>
                                    {s.start && <span>{s.start}</span>}
                                    {s.location && <span>{s.location}</span>}
                                </div>
                                <div className="actions">
                                    <button
                                        className="btn approve"
                                        onClick={e => {
                                            e.stopPropagation();
                                            approve(s.id);
                                        }}
                                    >
                                        Schválit
                                    </button>
                                    <button
                                        className="btn delete"
                                        onClick={e => {
                                            e.stopPropagation();
                                            removeCard(s.id, 'submissions');
                                        }}
                                    >
                                        Smazat
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Schválené události</h3>
                    <span className="pill">{approved.length}</span>
                </div>
                <div className="cards-grid">
                    {approved.map(ev => (
                        <article
                            key={ev.id}
                            className="card"
                            onClick={() => openEdit(ev, 'events')}
                            title="Upravit"
                        >
                            {ev.posterUrl && <img src={ev.posterUrl} alt="" className="card-poster" />}
                            <div className="card-body">
                                <h4 className="card-title">{ev.title || 'Bez názvu'}</h4>
                                <div className="meta">
                                    <span>{ev.startDate}</span>
                                    {ev.start && <span>{ev.start}</span>}
                                    {ev.location && <span>{ev.location}</span>}
                                </div>
                                <div className="actions">
                                    <button
                                        className="btn neutral"
                                        onClick={e => {
                                            e.stopPropagation();
                                            unapprove(ev.id);
                                        }}
                                    >
                                        Vrátit mezi neschválené
                                    </button>
                                    <button
                                        className="btn delete"
                                        onClick={e => {
                                            e.stopPropagation();
                                            removeCard(ev.id, 'events');
                                        }}
                                    >
                                        Smazat
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* MODAL */}
            {modalOpen && editedEvent && (
                <div className="modal-bg" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Upravit událost</h3>
                            <button className="icon-close" onClick={closeModal}>
                                ×
                            </button>
                        </div>

                        <div className="modal-grid">
                            {/* All previous fields... */}
                            <div className="field">
                                <label>Název</label>
                                <input
                                    value={editedEvent.title || ''}
                                    onChange={e => setField('title', e.target.value)}
                                />
                            </div>

                            {/* --- CHANGED: Date picker now supports range --- */}
                            <div className="field">
                                <label>Datum (nebo rozmezí)</label>
                                <ReactDatePicker
                                    // Use 'selected' for the first date, 'startDate' for the actual start
                                    selected={
                                        editedEvent.startDate ? new Date(editedEvent.startDate) : null
                                    }
                                    startDate={
                                        editedEvent.startDate ? new Date(editedEvent.startDate) : null
                                    }
                                    endDate={
                                        // Handle empty string or null endDate
                                        editedEvent.endDate ? new Date(editedEvent.endDate) : null
                                    }
                                    onChange={handleModalDateChange} // Use the new handler
                                    selectsRange // Enable range selection
                                    dateFormat="dd.MM.yyyy"
                                    locale="cs"
                                    className="date-picker"
                                    readOnly
                                />
                            </div>

                            <div className="field">
                                <label>Čas</label>
                                <ReactDatePicker
                                    selected={
                                        editedEvent.start
                                            ? new Date(`1970-01-01T${editedEvent.start}`)
                                            : null
                                    }
                                    onChange={d =>
                                        setField(
                                            'start',
                                            d ? d.toTimeString().slice(0, 5) : ''
                                        )
                                    }
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={5}
                                    timeCaption="Čas"
                                    dateFormat="HH:mm"
                                    locale="cs"
                                    placeholderText="Vyberte čas"
                                    className="date-picker"
                                    readOnly
                                />
                            </div>

                            {/* --- CHANGED: Category is now a dropdown --- */}
                            <div className="field">
                                <label>Kategorie</label>
                                <select
                                    value={editedEvent.category || ''}
                                    onChange={e => setField('category', e.target.value)}
                                >
                                    <option value="">Vyberte</option>
                                    <option value="kultura">Kultura</option>
                                    <option value="sport">Sport</option>
                                    <option value="vzdělávání">Vzdělávání</option>
                                </select>
                            </div>

                            <div className="field">
                                <label>Cena</label>
                                <input
                                    value={editedEvent.price || ''}
                                    onChange={e => setField('price', e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label>Místo</label>
                                <input
                                    value={editedEvent.location || ''}
                                    onChange={e => {
                                        setField('location', e.target.value);
                                        setLocQuery(e.target.value);
                                    }}
                                    autoComplete="off"
                                />
                                {locSuggestions.length > 0 && (
                                    <ul className="suggestions" ref={suggRef}>
                                        {locSuggestions.map((s, i) => (
                                            <li
                                                key={i}
                                                onClick={() => {
                                                    setField('location', s);
                                                    setLocQuery('');
                                                    setLocSuggestions([]);
                                                }}
                                            >
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* --- FACEBOOK URL FIELD --- */}
                            <div className="field">
                                <label>Facebook URL</label>
                                <input
                                    type="url"
                                    value={editedEvent.facebookUrl || ''}
                                    onChange={e => setField('facebookUrl', e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label>Plakát</label>
                                {editedEvent.posterUrl && (
                                    <img
                                        src={editedEvent.posterUrl}
                                        className="poster-preview"
                                        alt="Poster"
                                        // --- FIXED: posterUrl || null ---
                                        onClick={() => setFullScreenImageUrl(editedEvent.posterUrl || null)}
                                        title="Zobrazit celý plakát"
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setNewImage(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn save" onClick={saveChanges}>
                                Uložit změny
                            </button>
                            <button className="btn ghost" onClick={closeModal}>
                                Zavřít
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW: FULLSCREEN IMAGE VIEWER --- */}
            {fullScreenImageUrl && (
                <div className="fullscreen-viewer" onClick={() => setFullScreenImageUrl(null)}>
                    <img src={fullScreenImageUrl} alt="Fullscreen Poster" />
                </div>
            )}

            <div className="form-shell">
                <EventForm onSuccess={() => alert('Úspěšně přídáno')} />
            </div>
        </div>
    );
}