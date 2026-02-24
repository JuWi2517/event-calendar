import { useEffect, useState, type MouseEvent } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { db, app } from '../firebase';
import { getStorage } from 'firebase/storage';
const storage = getStorage(app);
import type { Event } from '../types/Event';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/AdminDashboard.css';
import EventForm from './EventForm';
import imageCompression from 'browser-image-compression';

import {
    type EventWithId,
    type CollectionType,
    type LocationSuggestion,
    type EventWithPosterPath,
    CATEGORY_OPTIONS,
    toLocalDateString,
    formatDisplayDate,
    getResizedImagePath,
    extractPosterPath,
    normalizeFacebookUrl,
    DatePickerCustomInput,
    LocationSuggestions,
    IconCalendar,
    IconClock,
    IconMapPin,
    IconPrice,
    IconTag,
    useLocationAutocomplete,
} from '../shared';

registerLocale('cs', cs);

// ============================================================================
// Main Component
// ============================================================================

export default function AdminDashboard() {

    // State for event lists
    const [pending, setPending] = useState<EventWithId[]>([]);
    const [approved, setApproved] = useState<EventWithId[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editedEvent, setEditedEvent] = useState<EventWithId | null>(null);
    const [editedCollection, setEditedCollection] = useState<CollectionType | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

    // Save & compression state
    const [isSaving, setIsSaving] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Price type state
    const [priceType, setPriceType] = useState<'free' | 'priced'>('free');

    // Location autocomplete
    const {
        setLocationQuery,
        locationSuggestions,
        setLocationSuggestions,
        locationError,
        setLocationError,
        resetLocationState,
    } = useLocationAutocomplete();

    // ========================================================================
    // Filtered Lists
    // ========================================================================

    const normalizedSearch = searchQuery.toLowerCase().trim();

    let filteredPending: EventWithId[];
    if (normalizedSearch) {
        filteredPending = pending.filter((event) =>
            (event.title || '').toLowerCase().includes(normalizedSearch)
        );
    } else {
        filteredPending = pending;
    }

    let filteredApproved: EventWithId[];
    if (normalizedSearch) {
        filteredApproved = approved.filter((event) =>
            (event.title || '').toLowerCase().includes(normalizedSearch)
        );
    } else {
        filteredApproved = approved;
    }

    // ========================================================================
    // Data Loading
    // ========================================================================

    useEffect(() => {
        async function loadEvents() {
            // Load pending submissions
            const submissionsSnap = await getDocs(collection(db, 'submissions'));
            const submissions = submissionsSnap.docs.map((document) => {
                const data = document.data() as Event;
                return {
                    id: document.id,
                    ...data,
                };
            });
            setPending(submissions);

            // Load approved events
            const eventsSnap = await getDocs(collection(db, 'events'));
            const events = eventsSnap.docs.map((document) => {
                const data = document.data() as Event;
                return {
                    id: document.id,
                    ...data,
                };
            });
            setApproved(events);
        }

        void loadEvents();
    }, []);

    // ========================================================================
    // Admin token refresh for push notifications
    // ========================================================================
    useEffect(() => {
    const refreshToken = async () => {
        try {
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
            if (!swReg) return;

            const { getMessaging, getToken } = await import('firebase/messaging');
            const messaging = getMessaging(app);
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_VAPID_KEY,
                serviceWorkerRegistration: swReg
            });

            if (token) {
                await setDoc(doc(db, "admin_tokens", token), {
                    token,
                    email: user.email || 'unknown',
                    uid: user.uid,
                    device: navigator.userAgent,
                    lastRefresh: serverTimestamp()
                }, { merge: true });
            }
        } catch (e) {
            console.error("Token refresh failed:", e);
        }
    };

    refreshToken();
}, []);
    // ========================================================================
    // Modal Handlers
    // ========================================================================

    function openEditModal(item: EventWithId, from: CollectionType) {
        setEditedEvent(item);
        setEditedCollection(from);
        setNewImage(null);
        setModalOpen(true);

        const hasPricedValue = item.price && item.price !== '' && item.price !== '0';
        if (hasPricedValue) {
            setPriceType('priced');
        } else {
            setPriceType('free');
        }

        resetLocationState();
    }

    function closeModal() {
        setModalOpen(false);
        setEditedEvent(null);
        setEditedCollection(null);
        setNewImage(null);
        setPriceType('free');
        resetLocationState();
    }

    // ========================================================================
    // Event Actions
    // ========================================================================

    async function approveEvent(id: string) {
        // Find the event in pending list
        const item = pending.find((event) => event.id === id);
        if (!item) {
            return;
        }

        if (!confirm('Schválit a přesunout do „events"?')) {
            return;
        }

        // Create payload without the id
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _unusedId, ...payload } = item;

        // Add to events collection with approved status
        const newEventData = {
            ...payload,
            status: 'approved',
        };
        await addDoc(collection(db, 'events'), newEventData);

        // Remove from submissions collection
        await deleteDoc(doc(db, 'submissions', id));

        // Update pending list - remove the approved event
        setPending((currentPendingList) => {
            return currentPendingList.filter((event) => event.id !== id);
        });

        // Update approved list - add the newly approved event at the start
        setApproved((currentApprovedList) => {
            const updatedItem: EventWithId = {
                ...item,
                status: 'approved',
            };
            return [updatedItem, ...currentApprovedList];
        });
    }

    async function unapproveEvent(id: string) {
        // Find the event in approved list
        const item = approved.find((event) => event.id === id);
        if (!item) {
            return;
        }

        if (!confirm('Vrátit ze „events" zpět do „submissions"?')) {
            return;
        }

        // Create payload without the id
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _unusedId, ...payload } = item;

        // Add back to submissions collection with pending status
        const newSubmissionData = {
            ...payload,
            status: 'pending',
        };
        await addDoc(collection(db, 'submissions'), newSubmissionData);

        // Remove from events collection
        await deleteDoc(doc(db, 'events', id));

        // Update approved list - remove the unapproved event
        setApproved((currentApprovedList) => {
            return currentApprovedList.filter((event) => event.id !== id);
        });

        // Update pending list - add the event back at the start
        setPending((currentPendingList) => {
            const updatedItem: EventWithId = {
                ...item,
                status: 'pending',
            };
            return [updatedItem, ...currentPendingList];
        });
    }

    async function deletePoster(event: Partial<Event>) {
        const pathToDelete = extractPosterPath(event);

        if (!pathToDelete) {
            return;
        }

        try {
            // Delete original image
            await deleteObject(ref(storage, pathToDelete));

            // Delete resized image
            const resizedPath = getResizedImagePath(pathToDelete);
            await deleteObject(ref(storage, resizedPath));
        } catch (error) {
            console.warn('Image delete warning:', error);
        }
    }

    async function deleteEvent(id: string, from: CollectionType) {
        // Get the correct list based on collection type
        let list: EventWithId[];
        if (from === 'submissions') {
            list = pending;
        } else {
            list = approved;
        }

        // Find the event
        const item = list.find((event) => event.id === id);
        if (!item) {
            return;
        }

        if (!confirm('Opravdu smazat?')) {
            return;
        }

        try {
            // Delete from Firestore
            await deleteDoc(doc(db, from, id));

            // Try to delete the poster image
            try {
                await deletePoster(item);
            } catch (error) {
                console.warn(error);
            }

            // Update local state
            if (from === 'submissions') {
                setPending((currentPendingList) => {
                    return currentPendingList.filter((event) => event.id !== id);
                });
            } else {
                setApproved((currentApprovedList) => {
                    return currentApprovedList.filter((event) => event.id !== id);
                });
            }
        } catch (error: unknown) {
            let errorMessage: string;
            if (error instanceof Error) {
                errorMessage = error.message;
            } else {
                errorMessage = String(error);
            }
            alert('Mazání selhalo: ' + errorMessage);
        }
    }

    async function saveChanges() {
        if (!editedEvent || !editedCollection || isSaving || isCompressing) {
            return;
        }

        setIsSaving(true);

        try {
            // Create a copy of the event to save
            const eventToSave: EventWithId = { ...editedEvent };

            // Validate required fields
            const missingFields: string[] = [];

            if (!eventToSave.title?.trim()) {
                missingFields.push('Název');
            }

            if (!eventToSave.location?.trim()) {
                missingFields.push('Místo');
            } else if (eventToSave.lat === 0 || eventToSave.lng === 0) {
                setLocationError(true);
                setIsSaving(false);
                return;
            }

            if (!eventToSave.startDate) {
                missingFields.push('Datum');
            }

            if (missingFields.length > 0) {
                alert('Není vyplněno povinné pole: ' + missingFields.join(', '));
                setIsSaving(false);
                return;
            }

            // Normalize Facebook URL if present
            if (eventToSave.facebookUrl) {
                eventToSave.facebookUrl = await normalizeFacebookUrl(eventToSave.facebookUrl);
            }

            // Handle new image upload
            if (newImage) {
                // Delete old poster first
                await deletePoster(eventToSave);

                // Upload new poster
                const newPath = `posters/${Date.now()}_${newImage.name}`;
                const newRef = ref(storage, newPath);
                await uploadBytes(newRef, newImage);

                // Update event with new poster info
                eventToSave.posterUrl = await getDownloadURL(newRef);
                (eventToSave as EventWithPosterPath).posterPath = newPath;
                (eventToSave as EventWithPosterPath).resizedPosterPath = getResizedImagePath(newPath);
            }

            // Save to Firestore
            const { id, ...payload } = eventToSave;
            await updateDoc(doc(db, editedCollection, id), payload);

            // Update local state
            if (editedCollection === 'submissions') {
                setPending((currentPendingList) => {
                    return currentPendingList.map((event) => {
                        if (event.id === id) {
                            return eventToSave;
                        }
                        return event;
                    });
                });
            } else {
                setApproved((currentApprovedList) => {
                    return currentApprovedList.map((event) => {
                        if (event.id === id) {
                            return eventToSave;
                        }
                        return event;
                    });
                });
            }

            closeModal();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Uložení selhalo.');
        } finally {
            setIsSaving(false);
        }
    }

    // ========================================================================
    // Form Field Handlers
    // ========================================================================

    function setField<K extends keyof Event>(key: K, value: Event[K]) {
        setEditedEvent((previousEvent) => {
            if (!previousEvent) {
                return null;
            }

            return {
                ...previousEvent,
                [key]: value,
            };
        });
    }

    function handleLocationChange(value: string) {
        setEditedEvent((previousEvent) => {
            if (!previousEvent) {
                return null;
            }

            return {
                ...previousEvent,
                location: value,
                lat: 0,
                lng: 0,
            };
        });

        setLocationQuery(value);
        setLocationError(false);
    }

    function handleLocationSelect(item: LocationSuggestion) {
        const rawName = item.name || item.label || '';
        const cleanName = rawName.split('(')[0].trim();
        const lat = item.position?.lat ?? 0;
        const lng = item.position?.lon ?? 0;

        setEditedEvent((previousEvent) => {
            if (!previousEvent) {
                return null;
            }

            return {
                ...previousEvent,
                location: cleanName,
                lat: lat,
                lng: lng,
            };
        });

        setLocationError(false);
        setLocationQuery('');
        setLocationSuggestions([]);
    }

    function handleDateChange(dates: [Date | null, Date | null]) {
        const [start, end] = dates;

        setEditedEvent((previousEvent) => {
            if (!previousEvent) {
                return null;
            }

            return {
                ...previousEvent,
                startDate: toLocalDateString(start),
                endDate: toLocalDateString(end),
            };
        });
    }

    function handleStartTimeChange(date: Date | null) {
        if (date) {
            const timeString = date.toTimeString().slice(0, 5);
            setField('start', timeString);
        } else {
            setField('start', '');
        }
    }

    function handleEndTimeChange(date: Date | null) {
        if (date) {
            const timeString = date.toTimeString().slice(0, 5);
            setField('end', timeString);
        } else {
            setField('end', '');
        }
    }

    function handlePriceTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newType = event.target.value as 'free' | 'priced';
        setPriceType(newType);

        // Clear price when switching to free
        if (newType === 'free') {
            setField('price', '');
        }
    }

    // ========================================================================
    // Render Helpers
    // ========================================================================

    function renderTimeDisplay(item: EventWithId) {
        if (item.end) {
            return `${item.start} - ${item.end}`;
        }
        return item.start;
    }

    function renderEventCard(item: EventWithId, type: CollectionType) {
        function handleCardClick() {
            openEditModal(item, type);
        }

        function handleApproveClick(clickEvent: MouseEvent) {
            clickEvent.stopPropagation();
            void approveEvent(item.id);
        }

        function handleUnapproveClick(clickEvent: MouseEvent) {
            clickEvent.stopPropagation();
            void unapproveEvent(item.id);
        }

        function handleDeleteClick(clickEvent: MouseEvent) {
            clickEvent.stopPropagation();
            void deleteEvent(item.id, type);
        }

        function renderActionButton() {
            if (type === 'submissions') {
                return (
                    <button className="btn approve" onClick={handleApproveClick}>
                        Schválit
                    </button>
                );
            }
            return (
                <button className="btn neutral" onClick={handleUnapproveClick}>
                    Vrátit mezi neschválené
                </button>
            );
        }

        return (
            <article key={item.id} className="card" onClick={handleCardClick}>
                {item.posterUrl && (
                    <img src={item.posterUrl} alt="" className="card-poster" />
                )}

                <div className="card-body">
                    <h4 className="card-title">{item.title || 'Bez názvu'}</h4>

                    <div className="card-details">
                        <div className="card-row">
                            <IconCalendar />
                            <span>{formatDisplayDate(item.startDate)}</span>
                        </div>

                        {item.start && (
                            <div className="card-row">
                                <IconClock />
                                <span>{renderTimeDisplay(item)}</span>
                            </div>
                        )}

                        {item.location && (
                            <div className="card-row">
                                <IconMapPin />
                                <span>{item.location}</span>
                            </div>
                        )}

                        {item.price && (
                            <div className="card-row">
                                <IconPrice />
                                <span>{item.price} Kč</span>
                            </div>
                        )}

                        {item.category && (
                            <div className="card-row">
                                <IconTag />
                                <span>{item.category}</span>
                            </div>
                        )}

                        {item.organizer && (
                            <div className="card-row">
                                <span style={{ fontSize: '0.85em', color: '#888' }}>
                                    Pořadatel: {item.organizer}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="actions">
                        {renderActionButton()}

                        <button className="btn delete" onClick={handleDeleteClick}>
                            Smazat
                        </button>
                    </div>
                </div>
            </article>
        );
    }

    // ========================================================================
    // Modal Field Helpers
    // ========================================================================

    function getSelectedStartDate(): Date | null {
        if (editedEvent?.startDate) {
            return new Date(editedEvent.startDate);
        }
        return null;
    }

    function getSelectedEndDate(): Date | null {
        if (editedEvent?.endDate) {
            return new Date(editedEvent.endDate);
        }
        return null;
    }

    function getSelectedStartTime(): Date | null {
        if (editedEvent?.start) {
            return new Date(`1970-01-01T${editedEvent.start}`);
        }
        return null;
    }

    function getSelectedEndTime(): Date | null {
        if (editedEvent?.end) {
            return new Date(`1970-01-01T${editedEvent.end}`);
        }
        return null;
    }

    function getSaveButtonText(): string {
        if (isSaving) {
            return 'Ukládám...';
        }
        return 'Uložit změny';
    }

    function getLocationClassName(): string {
        if (locationError) {
            return 'input-error';
        }
        return '';
    }

    // ========================================================================
    // Main Render
    // ========================================================================

    return (
        <div className="admin-page">
            <h2 className="admin-title">Správa událostí</h2>

<button
  style={{ marginBottom: '1rem', padding: '10px 20px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
  onClick={async () => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        alert("Notifikace nejsou na tomto zařízení podporovány.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Notifikace byly zamítnuty.");
        return;
      }

      // Always register fresh to pick up SW updates
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        updateViaCache: 'none'
      });
      await navigator.serviceWorker.ready;

      // Force activate waiting SW if there's an update
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (token) {
        const auth = (await import('firebase/auth')).getAuth();
        const user = auth.currentUser;

        // Use token as doc ID — natural dedup
        await setDoc(doc(db, "admin_tokens", token), {
          token,
          email: user?.email || 'unknown',
          uid: user?.uid || 'unknown',
          device: navigator.userAgent,
          createdAt: serverTimestamp(),
          lastRefresh: serverTimestamp()
        });

        alert("Notifikace byly úspěšně zapnuty!");
      } else {
        alert("Nepodařilo se získat token. Zkuste to znovu.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Chyba při zapínání notifikací: " + err.message);
    }
  }}
>
  Povolit notifikace
</button>

            {/* Search Bar */}
            <div className="search-bar">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Hledat události podle názvu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="search-clear"
                        onClick={() => setSearchQuery('')}
                        aria-label="Vymazat hledání"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Pending Submissions */}
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Neschválené návrhy</h3>
                    <span className="pill">{filteredPending.length}</span>
                </div>
                <div className="cards-grid">
                    {filteredPending.map((event) => renderEventCard(event, 'submissions'))}
                </div>
                {normalizedSearch && filteredPending.length === 0 && (
                    <p className="search-empty">Žádné neschválené návrhy neodpovídají hledání.</p>
                )}
            </section>

            {/* Approved Events */}
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Schválené události</h3>
                    <span className="pill">{filteredApproved.length}</span>
                </div>
                <div className="cards-grid">
                    {filteredApproved.map((event) => renderEventCard(event, 'events'))}
                </div>
                {normalizedSearch && filteredApproved.length === 0 && (
                    <p className="search-empty">Žádné schválené události neodpovídají hledání.</p>
                )}
            </section>

            {/* Edit Modal */}
            {modalOpen && editedEvent && (
                <div className="modal-bg" onClick={closeModal}>
                    <div className="modal" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Upravit událost</h3>
                            <button className="icon-close" onClick={closeModal}>
                                ×
                            </button>
                        </div>

                        <div className="modal-grid">
                            {/* Title */}
                            <div className="field">
                                <label>Název</label>
                                <input
                                    value={editedEvent.title || ''}
                                    onChange={(inputEvent) => setField('title', inputEvent.target.value)}
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div className="field">
                                <label>Datum</label>
                                <ReactDatePicker
                                    selected={getSelectedStartDate()}
                                    startDate={getSelectedStartDate()}
                                    endDate={getSelectedEndDate()}
                                    onChange={handleDateChange}
                                    selectsRange
                                    dateFormat="dd.MM.yyyy"
                                    locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Vyberte datum" />}
                                    required
                                    isClearable
                                />
                            </div>

                            {/* Start Time */}
                            <div className="field">
                                <label>Čas začátku</label>
                                <ReactDatePicker
                                    selected={getSelectedStartTime()}
                                    onChange={handleStartTimeChange}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={5}
                                    timeCaption="Čas"
                                    dateFormat="HH:mm"
                                    locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Vyberte čas" />}
                                    required
                                    isClearable
                                />
                            </div>

                            {/* End Time */}
                            <div className="field">
                                <label>Čas konce</label>
                                <ReactDatePicker
                                    selected={getSelectedEndTime()}
                                    onChange={handleEndTimeChange}
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={5}
                                    timeCaption="Čas"
                                    dateFormat="HH:mm"
                                    locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Nepovinné" />}
                                    isClearable
                                />
                            </div>

                            {/* Category */}
                            <div className="field">
                                <label>Kategorie</label>
                                <select
                                    value={editedEvent.category || ''}
                                    onChange={(selectEvent) => setField('category', selectEvent.target.value)}
                                >
                                    {CATEGORY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Price */}
                            <div className="field">
                                <label>Vstupné</label>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="priceType"
                                            value="free"
                                            checked={priceType === 'free'}
                                            onChange={handlePriceTypeChange}
                                        />
                                        <span>Dobrovolné</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="priceType"
                                            value="priced"
                                            checked={priceType === 'priced'}
                                            onChange={handlePriceTypeChange}
                                        />
                                        <span>Zpoplatněno</span>
                                    </label>
                                </div>
                                {priceType === 'priced' && (
                                    <input
                                        type="number"
                                        value={editedEvent.price || ''}
                                        onChange={(inputEvent) => setField('price', inputEvent.target.value)}
                                        placeholder="Cena v Kč"
                                    />
                                )}
                            </div>

                            {/* Location */}
                            <div className="field">
                                <label>Místo</label>
                                <input
                                    value={editedEvent.location || ''}
                                    onChange={(inputEvent) => handleLocationChange(inputEvent.target.value)}
                                    className={getLocationClassName()}
                                />
                                {locationError && (
                                    <div className="validation-error">
                                        Vyberte konkrétní místo z nabídky.
                                    </div>
                                )}
                                <LocationSuggestions
                                    suggestions={locationSuggestions}
                                    onSelect={handleLocationSelect}
                                />
                            </div>

                            {/* Organizer */}
                            <div className="field">
                                <label>Pořadatel</label>
                                <input
                                    type="text"
                                    value={editedEvent.organizer || ''}
                                    onChange={(inputEvent) => setField('organizer', inputEvent.target.value)}
                                    placeholder="Kdo pořádá tuto událost?"
                                />
                            </div>

                            {/* Facebook URL */}
                            <div className="field">
                                <label>Facebook URL</label>
                                <input
                                    type="url"
                                    value={editedEvent.facebookUrl || ''}
                                    onChange={(inputEvent) => setField('facebookUrl', inputEvent.target.value)}
                                />
                            </div>

                            {/* Poster */}
                            <div className="field">
                                <label>Plakát</label>
                                {editedEvent.posterUrl && (
                                    <img
                                        src={editedEvent.posterUrl}
                                        className="poster-preview"
                                        alt="Poster"
                                        onClick={() => setFullScreenImageUrl(editedEvent.posterUrl || null)}
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isCompressing}
                                    onChange={async (inputEvent) => {
                                        const file = inputEvent.target.files?.[0] ?? null;
                                        if (!file) return;
                                        setIsCompressing(true);
                                        try {
                                            const compressed = await imageCompression(file, {
                                                maxSizeMB: 1,
                                                maxWidthOrHeight: 1920,
                                                initialQuality: 0.9,
                                            });
                                            setNewImage(compressed);
                                        } catch (error) {
                                            console.error('Compression failed:', error);
                                        } finally {
                                            setIsCompressing(false);
                                        }
                                    }}
                                />
                                {isCompressing && (
                                    <p style={{ color: 'var(--muted)', fontSize: '0.9em', marginTop: '4px' }}>
                                        Probíhá komprese obrázku...
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn save"
                                onClick={() => void saveChanges()}
                                disabled={isSaving || isCompressing}
                            >
                                {getSaveButtonText()}
                            </button>
                            <button className="btn ghost" onClick={closeModal}>
                                Zavřít
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Viewer */}
            {fullScreenImageUrl && (
                <div
                    className="fullscreen-viewer"
                    onClick={() => setFullScreenImageUrl(null)}
                >
                    <img src={fullScreenImageUrl} alt="Fullscreen Poster" />
                </div>
            )}

            {/* Event Form */}
            <div className="form-shell">
                <EventForm onSuccess={() => alert('Úspěšně přídáno')} />
            </div>
        </div>
    );
}