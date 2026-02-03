import { useEffect, useState, type MouseEvent } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
    query,
    where,
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import type { Event } from '../types/Event';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/AdminDashboard.css';
import EventForm from './EventForm';

// Shared imports
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
} from '../sharedForDashboards';

registerLocale('cs', cs);

// ============================================================================
// Main Component
// ============================================================================

export default function HostDashboard() {
    // Auth state
    const [user, setUser] = useState<User | null>(null);

    // State for event lists
    const [pending, setPending] = useState<EventWithId[]>([]);
    const [approved, setApproved] = useState<EventWithId[]>([]);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editedEvent, setEditedEvent] = useState<EventWithId | null>(null);
    const [editedCollection, setEditedCollection] = useState<CollectionType | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);

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
    // Auth & Data Loading
    // ========================================================================

    useEffect(() => {
        const auth = getAuth();

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                void loadUserEvents(currentUser.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    async function loadUserEvents(userId: string) {
        // Load user's pending submissions
        const submissionsQuery = query(
            collection(db, 'submissions'),
            where('hostId', '==', userId)
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        const submissions = submissionsSnap.docs.map((document) => {
            const data = document.data() as Event;
            return {
                id: document.id,
                ...data,
            };
        });
        setPending(submissions);

        // Load user's approved events
        const eventsQuery = query(
            collection(db, 'events'),
            where('hostId', '==', userId)
        );
        const eventsSnap = await getDocs(eventsQuery);
        const events = eventsSnap.docs.map((document) => {
            const data = document.data() as Event;
            return {
                id: document.id,
                ...data,
            };
        });
        setApproved(events);
    }

    // ========================================================================
    // Modal Handlers
    // ========================================================================

    function openEditModal(item: EventWithId, from: CollectionType) {
        setEditedEvent(item);
        setEditedCollection(from);
        setNewImage(null);
        setModalOpen(true);
        resetLocationState();
    }

    function closeModal() {
        setModalOpen(false);
        setEditedEvent(null);
        setEditedCollection(null);
        setNewImage(null);
        resetLocationState();
    }

    // ========================================================================
    // Event Actions
    // ========================================================================

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
            console.warn('Could not delete some images:', error);
        }
    }

    async function deleteEvent(id: string, from: CollectionType) {
        // Get the correct list based on collection type
        const list = from === 'submissions' ? pending : approved;

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
                console.warn('Plakát se nepodařilo smazat:', error);
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert('Mazání selhalo: ' + errorMessage);
        }
    }

    async function saveChanges() {
        if (!editedEvent || !editedCollection) {
            return;
        }

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
            return;
        }

        if (!eventToSave.startDate) {
            missingFields.push('Datum');
        }

        if (missingFields.length > 0) {
            alert('Není vyplněno povinné pole: ' + missingFields.join(', '));
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

        // Get payload without id
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _unusedId, ...payload } = eventToSave;

        // If editing a PUBLIC event -> Move back to submissions for re-approval
        if (editedCollection === 'events') {
            const newPayload = {
                ...payload,
                status: 'pending',
            };

            // Create new document in submissions
            const docRef = await addDoc(collection(db, 'submissions'), newPayload);

            // Delete original from events
            await deleteDoc(doc(db, 'events', eventToSave.id));

            // Update UI - remove from approved, add to pending
            setApproved((currentApprovedList) => {
                return currentApprovedList.filter((event) => event.id !== eventToSave.id);
            });

            setPending((currentPendingList) => {
                const newEvent = {
                    ...newPayload,
                    id: docRef.id,
                } as EventWithId;
                return [newEvent, ...currentPendingList];
            });

            alert('Změna uložena. Událost byla přesunuta zpět ke schválení.');
        }
        // If editing a PENDING submission -> Just update it
        else {
            await updateDoc(doc(db, 'submissions', eventToSave.id), payload);

            setPending((currentPendingList) => {
                return currentPendingList.map((event) => {
                    if (event.id === eventToSave.id) {
                        return eventToSave;
                    }
                    return event;
                });
            });
        }

        closeModal();
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

    function handleTimeChange(date: Date | null) {
        if (date) {
            const timeString = date.toTimeString().slice(0, 5);
            setField('start', timeString);
        } else {
            setField('start', '');
        }
    }

    // ========================================================================
    // Render Helpers
    // ========================================================================

    function renderEventCard(item: EventWithId, type: CollectionType) {
        function handleCardClick() {
            openEditModal(item, type);
        }

        function handleEditClick(clickEvent: MouseEvent) {
            clickEvent.stopPropagation();
            openEditModal(item, type);
        }

        function handleDeleteClick(clickEvent: MouseEvent) {
            clickEvent.stopPropagation();
            void deleteEvent(item.id, type);
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
                                <span>{item.start}</span>
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
                    </div>

                    <div className="actions">
                        <button className="btn neutral" onClick={handleEditClick}>
                            Upravit
                        </button>
                        <button className="btn delete" onClick={handleDeleteClick}>
                            Smazat
                        </button>
                    </div>
                </div>
            </article>
        );
    }

    // ========================================================================
    // Main Render
    // ========================================================================

    // Show loading state while checking auth
    if (!user) {
        return <div className="admin-page">Načítám...</div>;
    }

    return (
        <div className="admin-page">
            <h2 className="admin-title">Moje události</h2>

            {/* Pending Submissions */}
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Čeká na schválení</h3>
                    <span className="pill">{pending.length}</span>
                </div>
                <div className="cards-grid">
                    {pending.map((event) => renderEventCard(event, 'submissions'))}
                </div>
            </section>

            {/* Approved Events */}
            <section className="admin-section">
                <div className="admin-section-head">
                    <h3>Schválené události</h3>
                    <span className="pill">{approved.length}</span>
                </div>
                <div className="cards-grid">
                    {approved.map((event) => renderEventCard(event, 'events'))}
                </div>
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
                                <label>Název:</label>
                                <input
                                    value={editedEvent.title || ''}
                                    onChange={(inputEvent) => setField('title', inputEvent.target.value)}
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div className="field">
                                <label>Datum:</label>
                                <ReactDatePicker
                                    selected={
                                        editedEvent.startDate
                                            ? new Date(editedEvent.startDate)
                                            : null
                                    }
                                    startDate={
                                        editedEvent.startDate
                                            ? new Date(editedEvent.startDate)
                                            : null
                                    }
                                    endDate={
                                        editedEvent.endDate
                                            ? new Date(editedEvent.endDate)
                                            : null
                                    }
                                    onChange={handleDateChange}
                                    selectsRange
                                    dateFormat="dd.MM.yyyy"
                                    locale="cs"
                                    customInput={<DatePickerCustomInput placeholder="Vyberte datum" />}
                                    required
                                    isClearable
                                />
                            </div>

                            {/* Time */}
                            <div className="field">
                                <label>Čas:</label>
                                <ReactDatePicker
                                    selected={
                                        editedEvent.start
                                            ? new Date(`1970-01-01T${editedEvent.start}`)
                                            : null
                                    }
                                    onChange={handleTimeChange}
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

                            {/* Category */}
                            <div className="field">
                                <label>Kategorie:</label>
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
                                <label>Cena:</label>
                                <input
                                    type="number"
                                    value={editedEvent.price || ''}
                                    onChange={(inputEvent) => setField('price', inputEvent.target.value)}
                                />
                            </div>

                            {/* Location */}
                            <div className="field">
                                <label>Místo:</label>
                                <input
                                    value={editedEvent.location || ''}
                                    onChange={(inputEvent) => handleLocationChange(inputEvent.target.value)}
                                    className={locationError ? 'input-error' : ''}
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

                            {/* Event URL */}
                            <div className="field">
                                <label>Odkaz na událost:</label>
                                <input
                                    type="url"
                                    value={editedEvent.facebookUrl || ''}
                                    onChange={(inputEvent) => setField('facebookUrl', inputEvent.target.value)}
                                />
                            </div>

                            {/* Poster */}
                            <div className="field">
                                <label>Plakát:</label>
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
                                    onChange={(inputEvent) => {
                                        const file = inputEvent.target.files?.[0] ?? null;
                                        setNewImage(file);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn save" onClick={() => void saveChanges()}>
                                Uložit změny
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