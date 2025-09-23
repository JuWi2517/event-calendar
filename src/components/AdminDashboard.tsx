import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Event } from '../types/Event';
import '../css/AdminDashboard.css';

export default function AdminDashboard() {
    const [subs, setSubs] = useState<Event[]>([]);
    const [modalEvent, setModalEvent] = useState<Event | null>(null);
    const [editedEvent, setEditedEvent] = useState<Event | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;

    useEffect(() => {
        async function fetchSubs() {
            const snapshot = await getDocs(collection(db, 'submissions'));
            const data = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Event) }));
            setSubs(data);
        }
        fetchSubs();
    }, []);

    const fetchLocationSuggestions = async (query: string) => {
        if (!query) {
            setLocationSuggestions([]);
            return;
        }
        try {
            const response = await fetch(
                `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(query)}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`
            );
            const data = await response.json();
            if (data.items && Array.isArray(data.items)) {
                const suggestions = data.items.map((item: any) => item.name);
                setLocationSuggestions(suggestions);
            } else {
                setLocationSuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching location suggestions:', error);
        }
    };

    const approve = async (id: string) => {
        if (!window.confirm('Fakt to chceš schválit?')) return;
        try {
            const sub = subs.find(s => s.id === id);
            if (!sub) return;
            const { id: _, ...eventData } = sub;
            await addDoc(collection(db, 'events'), { ...eventData, status: 'approved' });
            await deleteDoc(doc(db, 'submissions', id));
            setSubs(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error approving event:', error);
        }
    };

    const reject = async (id: string) => {
        if (!window.confirm('Fakt to chceš smazat?')) return;
        try {
            const sub = subs.find(s => s.id === id);
            if (sub?.posterUrl) {
                await deleteObject(ref(storage, sub.posterUrl)).catch(() => {});
            }
            await deleteDoc(doc(db, 'submissions', id));
            setSubs(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error rejecting and deleting event:', error);
        }
    };

    const handleLocationChange = (value: string) => {
        setEditedEvent(prev => prev ? { ...prev, location: value } : null);
        fetchLocationSuggestions(value);
    };

    const handleLocationSelect = (suggestion: string) => {
        setEditedEvent(prev => prev ? { ...prev, location: suggestion } : null);
        setLocationSuggestions([]);
    };

    const saveChanges = async () => {
        if (!editedEvent || !editedEvent.id) return;
        if (newImage) {
            if (editedEvent.posterUrl) {
                await deleteObject(ref(storage, editedEvent.posterUrl));
            }
            const imageRef = ref(storage, `images/${newImage.name}`);
            await uploadBytes(imageRef, newImage);
            const newImageUrl = await getDownloadURL(imageRef);
            editedEvent.posterUrl = newImageUrl;
        }
        await updateDoc(doc(db, 'submissions', editedEvent.id), editedEvent);
        setSubs(prev => prev.map(s => (s.id === editedEvent.id ? editedEvent : s)));
        setModalEvent(null);
        setEditedEvent(null);
        setNewImage(null);
    };

    return (
        <div className="admin-dashboard" style={{ padding: '1rem' }}>
            <h2>Správa podání (Admin)</h2>
            <div className="admin-dashboard-grid">
                {subs.map(s => (
                    <div key={s.id} className="admin-dashboard-card" onClick={() => { setModalEvent(s); setEditedEvent({ ...s }); }}>
                        <h3>{s.title}</h3>
                        <p>Datum: {s.date}</p>
                        <p>Místo: {s.location}</p>
                        <button onClick={e => { e.stopPropagation(); approve(s.id!); }}>Schválit</button>
                        <button onClick={e => { e.stopPropagation(); reject(s.id!); }}>Zamítnout</button>
                    </div>
                ))}
            </div>

            {modalEvent && editedEvent && (
                <div className="admin-dashboard-modal-bg" onClick={() => setModalEvent(null)}>
                    <div className="admin-dashboard-modal" onClick={e => e.stopPropagation()}>
                        <h2>Upravit událost</h2>
                        {editedEvent.posterUrl && <img src={editedEvent.posterUrl} alt="Poster" className="admin-dashboard-modal-poster" />}
                        {/* Form fields for editing... */}
                        <button onClick={saveChanges}>Uložit změny</button>
                        <button onClick={() => setModalEvent(null)}>Zavřít</button>
                    </div>
                </div>
            )}
        </div>
    );
}
