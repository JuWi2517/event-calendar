import { useEffect, useRef, useState, forwardRef } from 'react';
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
import MapyLogo from "../assets/Photos/imageedit_1_2894183964.webp";

registerLocale('cs', cs);

// --- TOTO JE TO ŘEŠENÍ: Tlačítko, které vypadá PŘESNĚ jako input ---
// eslint-disable-next-line react/display-name
const DatePickerCustomInput = forwardRef<HTMLButtonElement, any>(
    ({ value, onClick, placeholder, className }, ref) => (
        <button
            className={className}
            onClick={onClick}
            ref={ref}
            type="button"
            style={{
                // Kopie stylů z EventForm.css (.event-form-container input)
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--card2)', // #1b2230
                color: value ? 'var(--text)' : 'var(--muted)', // Pokud není hodnota, použije šedou pro placeholder
                border: '1px solid var(--line)', // #2a3242
                borderRadius: '10px',
                padding: '12px 14px', // Přesný padding z EventForm
                fontSize: '1rem', // Přesná velikost
                textAlign: 'left', // Zarovnání doleva jako input
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit', // Aby písmo nebylo jiné
                fontWeight: 400, // Tlačítka jsou defaultně tučná, inputy ne
                display: 'flex',
                alignItems: 'center',
                height: 'auto',
                lineHeight: 'normal'
            }}
        >
            {value || placeholder}
        </button>
    )
);

const toLocalDateString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}. ${month}. ${year}`;
};

function getResizedImagePath(originalPath: string): string {
    if (!originalPath) return '';
    const suffix = '_750x1080.webp';
    const lastDotIndex = originalPath.lastIndexOf('.');
    if (lastDotIndex === -1) return `${originalPath}${suffix}`;
    const pathWithoutExtension = originalPath.substring(0, lastDotIndex);
    return `${pathWithoutExtension}${suffix}`;
}

// --- ICONS ---
const IconCalendar = () => (<svg className="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>);
const IconClock = () => (<svg className="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);
const IconMapPin = () => (<svg className="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>);
const IconPrice = () => (<svg className="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>);
const IconTag = () => (<svg className="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>);

type WithId<T> = T & { id: string };

const FB_RESOLVER_ENDPOINT = 'https://us-central1-culture-calendar-4747b.cloudfunctions.net/api/resolve-link';

async function normalizeFacebookUrl(rawUrl: string): Promise<string> {
    const trimmedUrl = (rawUrl || '').trim();
    if (!trimmedUrl) return '';
    const directMatch = trimmedUrl.match(/facebook\.com\/events\/(\d+)/);
    if (directMatch) return `https://www.facebook.com/events/${directMatch[1]}/`;
    if (trimmedUrl.includes('fb.me')) {
        try {
            const response = await fetch(`${FB_RESOLVER_ENDPOINT}?url=${encodeURIComponent(trimmedUrl)}`);
            if (!response.ok) return trimmedUrl;
            const data = await response.json();
            if (data?.resolved) return String(data.resolved);
            return trimmedUrl;
        } catch { return trimmedUrl; }
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
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

    const [locQuery, setLocQuery] = useState('');
    const [locSuggestions, setLocSuggestions] = useState<any[]>([]);
    const [locationError, setLocationError] = useState(false);
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
                setLocSuggestions([]); return;
            }
            try {
                const resp = await fetch(
                    `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(locQuery)}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`,
                    { signal: ctl.signal }
                );
                const data = await resp.json();
                if (Array.isArray(data?.items)) setLocSuggestions(data.items);
                else setLocSuggestions([]);
            } catch { setLocSuggestions([]); }
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
        setLocationError(false);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditedEvent(null);
        setEditedCollection(null);
        setNewImage(null);
        setLocQuery('');
        setLocSuggestions([]);
        setLocationError(false);
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
        let pathToDelete = (obj as any)?.posterPath as string | undefined;
        if (!pathToDelete && obj.posterUrl) {
            try {
                const u = new URL(obj.posterUrl);
                const encoded = u.pathname.split('/o/')[1];
                if (encoded) pathToDelete = decodeURIComponent(encoded);
            } catch {}
        }
        if (pathToDelete) {
            try {
                await deleteObject(ref(storage, pathToDelete));
                const resizedPath = getResizedImagePath(pathToDelete);
                await deleteObject(ref(storage, resizedPath));
            } catch (error) { console.warn("Image delete warning:", error); }
        }
    };

    const removeCard = async (id: string, from: 'submissions' | 'events') => {
        const list = from === 'submissions' ? pending : approved;
        const itm = list.find(x => x.id === id);
        if (!itm) return;
        if (!confirm('Opravdu smazat?')) return;
        try {
            await deleteDoc(doc(db, from, id));
            try { await deletePosterIfAny(itm); } catch (e) { console.warn(e); }
            if (from === 'submissions') setPending(p => p.filter(x => x.id !== id));
            else setApproved(a => a.filter(x => x.id !== id));
        } catch (e: any) {
            alert('Mazání selhalo: ' + (e?.message ?? e));
        }
    };

    const saveChanges = async () => {
        if (!editedEvent || !editedCollection) return;
        const copy: WithId<Event> = { ...editedEvent };
        const missing: string[] = [];
        if (!copy.title || String(copy.title).trim() === '') missing.push('Název');
        if (!copy.location || String(copy.location).trim() === '') {
            missing.push('Místo');
        } else if (copy.lat === 0 || copy.lng === 0) {
            setLocationError(true);
            return;
        }
        if (!copy.startDate) missing.push('Datum');

        if (missing.length > 0) {
            alert('Není vyplněno povinné pole: ' + missing.join(', '));
            return;
        }
        if (copy.facebookUrl) {
            copy.facebookUrl = await normalizeFacebookUrl(copy.facebookUrl);
        }

        if (newImage) {
            await deletePosterIfAny(copy);
            const newPath = `posters/${Date.now()}_${newImage.name}`;
            const newRef = ref(storage, newPath);
            await uploadBytes(newRef, newImage);
            copy.posterUrl = await getDownloadURL(newRef);
            (copy as any).posterPath = newPath;
            (copy as any).resizedPosterPath = getResizedImagePath(newPath);
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
        const rawName = item.name || item.label || '';
        const cleanName = rawName.split('(')[0].trim();
        const lat = item.position?.lat ?? 0;
        const lng = item.position?.lon ?? 0;
        setEditedEvent(prev => {
            if (!prev) return null;
            return { ...prev, location: cleanName, lat: lat, lng: lng };
        });
        setLocationError(false);
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

    const renderCard = (item: WithId<Event>, type: 'submissions' | 'events') => (
        <article key={item.id} className="card" onClick={() => openEdit(item, type)}>
            {item.posterUrl && <img src={item.posterUrl} alt="" className="card-poster" />}
            <div className="card-body">
                <h4 className="card-title">{item.title || 'Bez názvu'}</h4>
                <div className="card-details">
                    <div className="card-row"><IconCalendar /><span>{formatDisplayDate(item.startDate)}</span></div>
                    {item.start && <div className="card-row"><IconClock /><span>{item.start}</span></div>}
                    {item.location && <div className="card-row"><IconMapPin /><span>{item.location}</span></div>}
                    {item.price && <div className="card-row"><IconPrice /><span>{item.price} Kč</span></div>}
                    {item.category && <div className="card-row"><IconTag /><span>{item.category}</span></div>}
                </div>
                <div className="actions">
                    {type === 'submissions' ? (
                        <button className="btn approve" onClick={e => { e.stopPropagation(); approve(item.id); }}>Schválit</button>
                    ) : (
                        <button className="btn neutral" onClick={e => { e.stopPropagation(); unapprove(item.id); }}>Vrátit mezi neschválené</button>
                    )}
                    <button className="btn delete" onClick={e => { e.stopPropagation(); removeCard(item.id, type); }}>Smazat</button>
                </div>
            </div>
        </article>
    );

    return (
        <div className="admin-page">
            <h2 className="admin-title">Správa událostí</h2>

            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Neschválené návrhy</h3>
                    <span className="pill">{pending.length}</span>
                </div>
                <div className="cards-grid">
                    {pending.map(s => renderCard(s, 'submissions'))}
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Schválené události</h3>
                    <span className="pill">{approved.length}</span>
                </div>
                <div className="cards-grid">
                    {approved.map(ev => renderCard(ev, 'events'))}
                </div>
            </section>

            {modalOpen && editedEvent && (
                <div className="modal-bg" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Upravit událost</h3>
                            <button className="icon-close" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-grid">
                            <div className="field">
                                <label>Název</label>
                                <input value={editedEvent.title || ''} onChange={e => setField('title', e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>Datum</label>
                                {/* --- POUŽITÍ CUSTOM INPUTU (TLAČÍTKA) --- */}
                                <ReactDatePicker
                                    selected={editedEvent.startDate ? new Date(editedEvent.startDate) : null}
                                    startDate={editedEvent.startDate ? new Date(editedEvent.startDate) : null}
                                    endDate={editedEvent.endDate ? new Date(editedEvent.endDate) : null}
                                    onChange={handleModalDateChange}
                                    selectsRange dateFormat="dd.MM.yyyy" locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Vyberte datum" />}
                                    required
                                    isClearable
                                />
                            </div>
                            <div className="field">
                                <label>Čas</label>
                                <ReactDatePicker
                                    selected={editedEvent.start ? new Date(`1970-01-01T${editedEvent.start}`) : null}
                                    onChange={d => setField('start', d ? d.toTimeString().slice(0, 5) : '')}
                                    showTimeSelect showTimeSelectOnly timeIntervals={5} timeCaption="Čas" dateFormat="HH:mm" locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Vyberte čas" />}
                                    required
                                    isClearable
                                />
                            </div>
                            <div className="field">
                                <label>Kategorie</label>
                                <select value={editedEvent.category || ''} onChange={e => setField('category', e.target.value)}>
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
                                <input type="number" value={editedEvent.price || ''} onChange={e => setField('price', e.target.value)} />
                            </div>
                            <div className="field">
                                <label>Místo</label>
                                <input
                                    value={editedEvent.location || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setEditedEvent(prev => prev ? { ...prev, location: val, lat: 0, lng: 0 } : null);
                                        setLocQuery(val);
                                        setLocationError(false);
                                    }}
                                    className={locationError ? 'input-error' : ''}
                                />
                                {locationError && <div className="validation-error">Vyberte konkrétní místo z nabídky.</div>}
                                {locSuggestions.length > 0 && (
                                    <ul className="suggestions" ref={suggRef}>
                                        {locSuggestions.map((item, i) => (
                                            <li key={i} onClick={() => handleLocationSelect(item)}>
                                                {item.name.split('(')[0].trim()}
                                                {item.label && <small style={{marginLeft:8, color:'#999'}}>({item.label})</small>}
                                            </li>
                                        ))}
                                        <li style={{ padding: '8px 12px', textAlign: 'right', cursor: 'default', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            <a href="https://mapy.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ fontSize: '0.8em', color: '#555' }}>Powered by</span>
                                                <img src={MapyLogo} alt="Mapy.com logo" style={{ height: '15px', width: 'auto', verticalAlign: 'middle' }} />
                                            </a>
                                        </li>
                                    </ul>
                                )}
                            </div>
                            <div className="field">
                                <label>Facebook URL</label>
                                <input type="url" value={editedEvent.facebookUrl || ''} onChange={e => setField('facebookUrl', e.target.value)} />
                            </div>
                            <div className="field">
                                <label>Plakát</label>
                                {editedEvent.posterUrl && (
                                    <img src={editedEvent.posterUrl} className="poster-preview" alt="Poster" onClick={() => setFullScreenImageUrl(editedEvent.posterUrl || null)} />
                                )}
                                <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] ?? null)} />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn save" onClick={saveChanges}>Uložit změny</button>
                            <button className="btn ghost" onClick={closeModal}>Zavřít</button>
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