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

const toLocalDateString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type WithId<T> = T & { id: string };

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

    // STATE FOR FULLSCREEN IMAGE VIEWER
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

    const [locQuery, setLocQuery] = useState('');
    const [locSuggestions, setLocSuggestions] = useState<any[]>([]);
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
                    setLocSuggestions(data.items);
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
            const resizedPosterPath = (obj as any)?.resizedPosterPath as string | undefined;
            if (path && resizedPosterPath) {
                await deleteObject(ref(storage, path));
                await deleteObject(ref(storage, resizedPosterPath));
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

        // VALIDATION: required fields
        const missing: string[] = [];
        if (!copy.title || String(copy.title).trim() === '') missing.push('Název');
        if (!copy.location || String(copy.location).trim() === '') missing.push('Místo');
        if (!copy.start || String(copy.start).trim() === '') missing.push('Čas');
        if (!copy.category || String(copy.category).trim() === '') missing.push('Kategorie');
        // startDate should be in YYYY-MM-DD format non-empty
        if (!copy.startDate || String(copy.startDate).trim() === '') missing.push('Datum');

        if (missing.length > 0) {
            alert('Není vyplněno povinné pole: ' + missing.join(', '));
            return;
        }

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


    const handleLocationSelect = (item: any) => {
        const name = item.name || item.label || '';
        const lat = item.position?.lat ?? 0;
        const lng = item.position?.lon ?? 0;

        setEditedEvent(prev => {
            if (!prev) return null;
            return {
                ...prev,
                location: name,
                lat: lat,
                lng: lng
            };
        });

        setLocQuery('');
        setLocSuggestions([]);
    };

    const handleModalDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setEditedEvent(prev => (prev ? ({
            ...prev,
            startDate: toLocalDateString(start),
            endDate: toLocalDateString(end),
        } as WithId<Event>) : prev));
    };

    return (
        <div className="admin-page">
            <h2 className="admin-title">Správa událostí</h2>

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
                            <div className="field">
                                <label>Název</label>
                                <input
                                    value={editedEvent.title || ''}
                                    onChange={e => setField('title', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Datum (nebo rozmezí)</label>
                                <ReactDatePicker
                                    selected={
                                        editedEvent.startDate ? new Date(editedEvent.startDate) : null
                                    }
                                    startDate={
                                        editedEvent.startDate ? new Date(editedEvent.startDate) : null
                                    }
                                    endDate={
                                        editedEvent.endDate ? new Date(editedEvent.endDate) : null
                                    }
                                    onChange={handleModalDateChange}
                                    selectsRange
                                    dateFormat="dd.MM.yyyy"
                                    locale="cs"
                                    className="date-picker"
                                    onFocus={(e) => e.target.blur()}
                                    onKeyDown={(e) => e.preventDefault()}
                                    required
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
                                    onFocus={(e) => e.target.blur()}
                                    onKeyDown={(e) => e.preventDefault()}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Kategorie</label>
                                <select
                                    value={editedEvent.category || ''}
                                    onChange={e => setField('category', e.target.value)}
                                    required
                                >
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
                            </div>

                            <div className="field">
                                <label>Cena</label>
                                <input
                                    value={editedEvent.price || ''}
                                    onChange={e => setField('price', e.target.value)}
                                />
                            </div>

                            {/* --- LOCATION FIELD: STRICT TYPE FIX --- */}
                            <div className="field">
                                <label>Místo</label>
                                <input
                                    value={editedEvent.location || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setEditedEvent(prev => prev ? {
                                            ...prev,
                                            location: val
                                            // NEVYMAZÁVÁME lat/lng. Musí zůstat číslem.
                                            // Aktualizují se až po kliknutí na našeptávač.
                                        } : null);
                                        setLocQuery(val);
                                    }}
                                    autoComplete="off"
                                    required
                                />
                                {locSuggestions.length > 0 && (
                                    <ul className="suggestions" ref={suggRef}>
                                        {locSuggestions.map((item, i) => (
                                            <li
                                                key={i}
                                                onClick={() => handleLocationSelect(item)}
                                            >
                                                {item.name} {item.label && <small>({item.label})</small>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

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
