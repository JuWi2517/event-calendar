import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Event } from '../types/Event';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function EditEventForm({ eventId, onSuccess }: { eventId: string; onSuccess: () => void }) {
    const [form, setForm] = useState<Partial<Event>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const snap = await getDoc(doc(db, 'events', eventId));
            setForm(snap.data() as Event);
        })();
    }, [eventId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await updateDoc(doc(db, 'events', eventId), form as any);
        setLoading(false);
        onSuccess();
    };

    if (!form.title) return <div>Načítám...</div>;

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '1rem auto' }}>
            <h3>Upravit událost</h3>
            <input name="title" value={form.title} onChange={handleChange} />
            {/* další pole obdobně */}
            <button type="submit" disabled={loading}>{loading ? 'Ukládám...' : 'Uložit'}</button>
        </form>
    );
}