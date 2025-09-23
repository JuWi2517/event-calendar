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

export default function EventForm({ onSuccess }: { onSuccess: () => void }) {
    const [form, setForm] = useState<{
        title: string;
        category: string;
        date: Date | null;
        start: string;
        price: string;
        location: string;
        facebookUrl: string;
        poster: File | null;
        lat: number;
        lng: number;
    }>({
        title: '',
        category: '',
        date: null,
        start: '',
        price: '',
        location: '',
        facebookUrl: '',
        poster: null,
        lat: 0,
        lng: 0,
    });
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;

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
                        name: item.name,
                        lat: item.position.lat,
                        lng: item.position.lon
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

    const handleDateChange = (date: Date | null) => {
        setForm(prev => ({ ...prev, date }));
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
            let posterUrl = '';
            if (form.poster) {
                const imgRef = ref(storage, `posters/${Date.now()}_${form.poster.name}`);
                await uploadBytes(imgRef, form.poster);
                posterUrl = await getDownloadURL(imgRef);
            }
            const dateString = form.date ? form.date.toISOString().split('T')[0] : '';
            const { poster, date, ...rest } = form;
            const newEvent: Event = {
                ...rest,
                date: dateString,
                posterUrl,
                status: 'pending',
                lat: form.lat,
                lng: form.lng,
            };
            await addDoc(collection(db, 'submissions'), newEvent);
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
                <h2>Navrhněte událost</h2>
                <label>Název:</label>
                <input name="title" value={form.title} onChange={handleChange} required />

                <label>Kategorie:</label>
                <select name="category" value={form.category} onChange={handleChange} required>
                    <option value="">Vyberte</option>
                    <option value="kultura">Kultura</option>
                    <option value="sport">Sport</option>
                    <option value="vzdělávání">Vzdělávání</option>
                </select>

                <label>Datum:</label>
                <ReactDatePicker
                    selected={form.date}
                    onChange={handleDateChange}
                    locale="cs"
                    dateFormat="dd.MM.yyyy"
                    placeholderText="Vyberte datum"
                    className="date-picker"
                    required
                />

                <label>Čas:</label>
                <ReactDatePicker
                    selected={form.start ? new Date(`1970-01-01T${form.start}`) : null}
                    onChange={date => setForm(prev => ({ ...prev, start: date ? date.toTimeString().slice(0,5) : '' }))}
                    locale="cs"
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={1}
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

                <label>Facebook URL:</label>
                <input type="url" name="facebookUrl" value={form.facebookUrl} onChange={handleChange} />

                <label>Plakát:</label>
                <input type="file" accept="image/*" onChange={handleFile} />

                <button type="submit" disabled={loadingSubmit}>
                    {loadingSubmit ? 'Odesílám...' : 'Odeslat'}
                </button>
            </form>
        </div>
    );
}
