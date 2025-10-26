import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '../firebase';
import type { Event } from '../types/Event';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import cs from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/EventForm.css';

interface Suggestion {
    name: string;
    lat: number;
    lng: number;
}

registerLocale('cs', cs);

// --- NEW HELPER FUNCTION TO AVOID TIMEZONE ISSUES ---
/**
 * Converts a Date object to a 'YYYY-MM-DD' string based on its local date parts,
 * ignoring timezone conversions that cause off-by-one-day errors.
 * @param date The Date object to format.
 * @returns The formatted date string or an empty string if the date is null.
 */
const toLocalDateString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

export default function EventForm({ onSuccess }: { onSuccess: () => void }) {
    const [form, setForm] = useState({
        title: '',
        category: '',
        startDate: null as Date | null,
        endDate: null as Date | null,
        start: '',
        price: '',
        location: '',
        facebookUrl: '',
        poster: null as File | null,
        lat: 0,
        lng: 0,
    });
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const dropdownRef = useRef<HTMLUListElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;

    const resetForm = () => {
        setForm({
            title: '', category: '', startDate: null, endDate: null, start: '',
            price: '', location: '', facebookUrl: '', poster: null, lat: 0, lng: 0,
        });
        setSuggestions([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useEffect(() => {
        const controller = new AbortController();
        if (form.location.length < 3) {
            setSuggestions([]);
            return;
        }
        (async () => {
            try {
                const resp = await fetch(
                    `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(form.location)}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`,
                    { signal: controller.signal }
                );
                const data = await resp.json();
                if (Array.isArray(data.items)) {
                    const list = data.items.map((item: any) => ({
                        name: item.name, lat: item.position.lat, lng: item.position.lon,
                    }));
                    setSuggestions(list);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        })();
        return () => controller.abort();
    }, [form.location]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value } as any));
    };

    const handleDateChange = (dates: [Date | null, Date | null]) => {
        const [start, end] = dates;
        setForm(prev => ({ ...prev, startDate: start, endDate: end }));
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setForm(prev => ({ ...prev, poster: e.target.files[0] }));
        }
    };

    const handleSelect = (s: Suggestion) => {
        setForm(prev => ({ ...prev, location: s.name, lat: s.lat, lng: s.lng }));
        setSuggestions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingSubmit(true);
        try {
            const normalizedFbUrl = await normalizeFacebookUrl(form.facebookUrl);

            let posterUrl = '';
            let posterPath = '';
            if (form.poster) {
                const path = `posters/${Date.now()}_${form.poster.name}`;
                const imgRef = ref(storage, path);
                await uploadBytes(imgRef, form.poster);
                posterUrl = await getDownloadURL(imgRef);
                posterPath = path;
            }

            // --- FIXED: Use the new timezone-safe helper function ---
            const startDateString = toLocalDateString(form.startDate);
            const endDateString = toLocalDateString(form.endDate || form.startDate);

            const { poster, startDate, endDate, ...rest } = form;

            const newEvent: Omit<Event, 'id'> & { posterPath: string } = {
                ...rest,
                facebookUrl: normalizedFbUrl,
                startDate: startDateString,
                endDate: endDateString,
                posterUrl,
                posterPath,
                status: 'pending',
                lat: form.lat,
                lng: form.lng,
            };

            await addDoc(collection(db, 'submissions'), newEvent);
            resetForm();
            setLoadingSubmit(false);
            onSuccess();
        } catch (error) {
            console.error('Error submitting event:', error);
            setLoadingSubmit(false);
        }
    };

    return (
        <div className="event-form-container">
            <form onSubmit={handleSubmit}>
                <h2>Přidejte vaší událost</h2>
                <label>Název:</label>
                <input name="title" value={form.title} onChange={handleChange} required />
                <label>Kategorie:</label>
                <select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Vyberte</option>
                    <option value="kultura">Kultura</option>
                    <option value="sport">Sport</option>
                    <option value="vzdělávání">Vzdělávání</option>
                </select>
                <label>Datum (nebo rozmezí):</label>
                <ReactDatePicker
                    startDate={form.startDate}
                    endDate={form.endDate}
                    onChange={handleDateChange}
                    selectsRange
                    locale="cs"
                    dateFormat="dd.MM.yyyy"
                    placeholderText="Vyberte jedno nebo více datumů"
                    className="date-picker"
                    required
                />
                <label>Čas:</label>
                <ReactDatePicker
                    selected={form.start ? new Date(`1970-01-01T${form.start}`) : null}
                    onChange={date =>
                        setForm(prev => ({ ...prev, start: date ? date.toTimeString().slice(0, 5) : '' }))
                    }
                    locale="cs"
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Čas"
                    dateFormat="HH:mm"
                    placeholderText="Vyberte čas"
                    className="date-picker"
                    required
                />
                <label>Cena:</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} />
                <label>Místo:</label>
                <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    autoComplete="off"
                    required
                />
                {suggestions.length > 0 && (
                    <ul ref={dropdownRef} className="suggestions">
                        {suggestions.map((s, i) => (
                            <li key={i} onClick={() => handleSelect(s)}>
                                {s.name}
                            </li>
                        ))}
                    </ul>
                )}
                <label>Odkaz na událost:</label>
                <input type="url" name="facebookUrl" value={form.facebookUrl} onChange={handleChange} />
                <label>Plakát:</label>
                <input type="file" accept="image/*" onChange={handleFile} ref={fileInputRef} />
                <button type="submit" disabled={loadingSubmit}>
                    {loadingSubmit ? 'Odesílám...' : 'Odeslat'}
                </button>
            </form>
        </div>
    );
}