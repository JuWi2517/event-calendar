import { useState, useEffect, useRef, forwardRef, type ChangeEvent, type FormEvent } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '../firebase';
import type { Event } from '../types/Event';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactDatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { cs } from 'date-fns/locale/cs';
import 'react-datepicker/dist/react-datepicker.css';
import '../css/EventForm.css';
import imageCompression from 'browser-image-compression';
import MapyLogo from '../assets/Photos/imageedit_1_2894183964.webp';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Shared imports
import {
    CATEGORY_OPTIONS,
    toLocalDateString,
    getResizedImagePath,
    normalizeFacebookUrl,
} from '../shared';


registerLocale('cs', cs);

// ============================================================================
// Types
// ============================================================================

interface EventFormProps {
    onSuccess: () => void;
}

interface FormState {
    title: string;
    category: string;
    startDate: Date | null;
    endDate: Date | null;
    start: string;
    price: string;
    location: string;
    facebookUrl: string;
    poster: File | null;
    lat: number;
    lng: number;
}

interface LocationSuggestion {
    name: string;
    lat: number;
    lng: number;
}

interface DatePickerInputProps {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    className?: string;
}

interface MapyApiItem {
    name: string;
    position: {
        lat: number;
        lon: number;
    };
}

// ============================================================================
// Constants
// ============================================================================

const INITIAL_FORM_STATE: FormState = {
    title: '',
    category: '',
    startDate: null,
    endDate: null,
    start: '',
    price: '',
    location: '',
    facebookUrl: '',
    poster: null,
    lat: 0,
    lng: 0,
};

const IMAGE_COMPRESSION_OPTIONS = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebP: true,
    initialQuality: 0.9,
};

// ============================================================================
// Components
// ============================================================================

const DatePickerCustomInput = forwardRef<HTMLButtonElement, DatePickerInputProps>(
    function DatePickerCustomInput({ value, onClick, placeholder, className }, ref) {
        return (
            <button
                className={className}
                onClick={onClick}
                ref={ref}
                type="button"
            >
                {value || placeholder}
            </button>
        );
    }
);

// ============================================================================
// Main Component
// ============================================================================

export default function EventForm({ onSuccess }: EventFormProps) {
    // Form state
    const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [createdEventId, setCreatedEventId] = useState<string | null>(null);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionError, setCompressionError] = useState('');

    // Location autocomplete state
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const justSelectedSuggestion = useRef(false);

    // Validation errors
    const [locationError, setLocationError] = useState(false);
    const [dateError, setDateError] = useState(false);
    const [timeError, setTimeError] = useState(false);

    // Refs
    const dropdownRef = useRef<HTMLUListElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // External dependencies
    const MAPY_API_KEY = import.meta.env.VITE_MAPY_API_KEY;
    const auth = getAuth();
    const navigate = useNavigate();

    // ========================================================================
    // Auth Listener
    // ========================================================================

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, [auth]);

    // ========================================================================
    // Location Autocomplete
    // ========================================================================

    useEffect(() => {
        // Skip if user just selected a suggestion
        if (justSelectedSuggestion.current) {
            justSelectedSuggestion.current = false;
            return;
        }

        // Need at least 3 characters to search
        if (form.location.length < 3) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();

        async function fetchSuggestions() {
            try {
                const requestUrl = `https://api.mapy.cz/v1/suggest/?query=${encodeURIComponent(form.location)}&lang=cs&type=poi&locality=Louny&apikey=${MAPY_API_KEY}`;
                const response = await fetch(requestUrl, { signal: controller.signal });
                const data = await response.json();

                if (Array.isArray(data.items)) {
                    const suggestionList = data.items.map((item: MapyApiItem) => ({
                        name: item.name,
                        lat: item.position.lat,
                        lng: item.position.lon,
                    }));
                    setSuggestions(suggestionList);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
                setSuggestions([]);
            }
        }

        void fetchSuggestions();

        return () => controller.abort();
    }, [form.location, MAPY_API_KEY]);

    // ========================================================================
    // Form Helpers
    // ========================================================================

    function resetForm() {
        setForm(INITIAL_FORM_STATE);
        setSuggestions([]);
        setLocationError(false);
        setDateError(false);
        setTimeError(false);
        setIsCompressing(false);
        setCompressionError('');
        setCreatedEventId(null);
        setShowAuthModal(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function updateFormField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm((previousForm) => {
            return {
                ...previousForm,
                [field]: value,
            };
        });
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = event.target;

        if (name === 'location') {
            // Reset coordinates when location text changes manually
            justSelectedSuggestion.current = false;
            setLocationError(false);
            setForm((previousForm) => {
                return {
                    ...previousForm,
                    location: value,
                    lat: 0,
                    lng: 0,
                };
            });
        } else {
            updateFormField(name as keyof FormState, value);
        }
    }

    function handleDateChange(dates: [Date | null, Date | null]) {
        const [startDate, endDate] = dates;

        setForm((previousForm) => {
            return {
                ...previousForm,
                startDate: startDate,
                endDate: endDate,
            };
        });

        if (startDate) {
            setDateError(false);
        }
    }

    function handleTimeChange(date: Date | null) {
        if (date) {
            const timeString = date.toTimeString().slice(0, 5);
            updateFormField('start', timeString);
            setTimeError(false);
        } else {
            updateFormField('start', '');
        }
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        setCompressionError('');
        setIsCompressing(true);
        updateFormField('poster', null);

        if (!file) {
            setIsCompressing(false);
            return;
        }

        try {
            const compressedFile = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
            updateFormField('poster', compressedFile);
        } catch (error) {
            console.error('Error compressing image:', error);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } finally {
            setIsCompressing(false);
        }
    }

    function handleLocationSelect(suggestion: LocationSuggestion) {
        justSelectedSuggestion.current = true;

        setForm((previousForm) => {
            return {
                ...previousForm,
                location: suggestion.name,
                lat: suggestion.lat,
                lng: suggestion.lng,
            };
        });

        setLocationError(false);
        setSuggestions([]);
    }

    // ========================================================================
    // Form Submission
    // ========================================================================

    function validateForm(): boolean {
        let hasError = false;

        if (!form.startDate) {
            setDateError(true);
            hasError = true;
        }

        if (!form.start) {
            setTimeError(true);
            hasError = true;
        }

        if (form.lat === 0 || form.lng === 0) {
            setLocationError(true);
            hasError = true;
        }

        // Validate URL format if provided
        if (form.facebookUrl && form.facebookUrl.trim() !== '') {
            try {
                new URL(form.facebookUrl);
            } catch {
                alert('Zadaná URL není platná. Ujistěte se, že odkaz začíná na "https://".');
                return false;
            }
        }

        if (isCompressing) {
            alert('Počkejte prosím, obrázek se stále zpracovává.');
            return false;
        }

        return !hasError;
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Normalize Facebook URL
            const normalizedFacebookUrl = await normalizeFacebookUrl(form.facebookUrl);

            // Upload poster if present
            let posterUrl = '';
            let posterPath = '';

            if (form.poster) {
                const path = `posters/${Date.now()}_${form.poster.name}`;
                const imageRef = ref(storage, path);
                await uploadBytes(imageRef, form.poster);
                posterUrl = await getDownloadURL(imageRef);
                posterPath = path;
            }

            // Prepare event data
            const resizedPosterPath = getResizedImagePath(posterPath);
            const startDateString = toLocalDateString(form.startDate);
            const endDateString = toLocalDateString(form.endDate || form.startDate);

            const newEvent: Omit<Event, 'id'> & {
                posterPath: string;
                resizedPosterPath: string;
                hostId: string | null;
            } = {
                title: form.title,
                category: form.category,
                startDate: startDateString,
                endDate: endDateString,
                start: form.start,
                price: form.price,
                location: form.location,
                facebookUrl: normalizedFacebookUrl,
                posterUrl: posterUrl,
                posterPath: posterPath,
                resizedPosterPath: resizedPosterPath,
                status: 'pending',
                lat: form.lat,
                lng: form.lng,
                hostId: user ? user.uid : null,
            };

            // Save to Firestore
            const docRef = await addDoc(collection(db, 'submissions'), newEvent);

            setIsSubmitting(false);

            // Handle success based on auth state
            if (user) {
                resetForm();
                onSuccess();
            } else {
                setCreatedEventId(docRef.id);
                setShowAuthModal(true);
            }
        } catch (error) {
            console.error('Error submitting event:', error);
            setIsSubmitting(false);
        }
    }

    // ========================================================================
    // Auth Modal Handlers
    // ========================================================================

    function handleContinueAsGuest() {
        resetForm();
        onSuccess();
    }

    function handleRegisterRedirect() {
        navigate('/registrace', { state: { claimEventId: createdEventId } });
    }

    function handleLoginRedirect() {
        navigate('/prihlaseni', { state: { claimEventId: createdEventId } });
    }

    // ========================================================================
    // Render Helpers
    // ========================================================================

    function renderLocationSuggestions() {
        if (suggestions.length === 0) {
            return null;
        }

        return (
            <ul ref={dropdownRef} className="suggestions">
                {suggestions.map((suggestion, index) => {
                    function handleClick() {
                        handleLocationSelect(suggestion);
                    }

                    return (
                        <li key={index} onClick={handleClick}>
                            {suggestion.name}
                        </li>
                    );
                })}

                <li
                    style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        cursor: 'default',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                    }}
                >
                    <a
                        href="https://mapy.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                        <span style={{ fontSize: '0.8em', color: '#555' }}>Powered by</span>
                        <img
                            src={MapyLogo}
                            alt="Mapy.com logo"
                            style={{ height: '15px', width: 'auto', verticalAlign: 'middle' }}
                        />
                    </a>
                </li>
            </ul>
        );
    }

    function renderAuthModal() {
        if (!showAuthModal) {
            return null;
        }

        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '16px',
                    backdropFilter: 'blur(3px)',
                }}
            >
                <div
                    className="card"
                    style={{
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                        padding: '48px 32px',
                    }}
                >
                    <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.8rem' }}>
                        🎉 Událost odeslána!
                    </h2>

                    <p
                        style={{
                            color: 'var(--muted)',
                            marginBottom: '32px',
                            fontSize: '1.1rem',
                            lineHeight: '1.6',
                        }}
                    >
                        Chcete mít možnost tuto událost v budoucnu{' '}
                        <strong>upravit nebo smazat</strong>?
                        <br />
                        Vytvořte si účet a událost se k němu automaticky přiřadí.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            className="btn approve"
                            style={{ padding: '14px', fontSize: '1.05rem' }}
                            onClick={handleRegisterRedirect}
                        >
                            Vytvořit účet (a přiřadit událost)
                        </button>

                        <button
                            className="btn neutral"
                            style={{ padding: '14px', fontSize: '1.05rem' }}
                            onClick={handleLoginRedirect}
                        >
                            Přihlásit se (a přiřadit událost)
                        </button>

                        <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />

                        <button
                            className="btn ghost"
                            style={{ padding: '12px' }}
                            onClick={handleContinueAsGuest}
                        >
                            Ne, pokračovat jako host
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // Main Render
    // ========================================================================

    return (
        <div className="event-form-container">
            <form onSubmit={handleSubmit}>
                <h2>Přidejte vaší událost</h2>

                <p
                    className="required-note"
                    style={{ fontSize: '0.9em', color: '#aaa', marginTop: '-10px' }}
                >
                    * Povinná pole
                </p>

                {/* Title */}
                <label>Název: *</label>
                <input
                    type="text"
                    maxLength={60}
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    required
                />

                {/* Category */}
                <label>Kategorie: *</label>
                <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    required
                >
                    {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Date */}
                <label>Datum (nebo rozmezí): *</label>
                <ReactDatePicker
                    startDate={form.startDate}
                    endDate={form.endDate}
                    onChange={handleDateChange}
                    selectsRange
                    locale="cs"
                    dateFormat="dd.MM.yyyy"
                    placeholderText="Vyberte datum"
                    customInput={
                        <DatePickerCustomInput
                            className={`date-picker ${dateError ? 'input-error' : ''}`}
                        />
                    }
                    isClearable
                />
                {dateError && (
                    <div className="validation-error">
                        <span>Toto pole je povinné.</span>
                    </div>
                )}

                {/* Time */}
                <label>Začátek: *</label>
                <ReactDatePicker
                    selected={form.start ? new Date(`1970-01-01T${form.start}`) : null}
                    onChange={handleTimeChange}
                    locale="cs"
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Čas"
                    dateFormat="HH:mm"
                    placeholderText="Vyberte čas"
                    customInput={
                        <DatePickerCustomInput
                            className={`date-picker ${timeError ? 'input-error' : ''}`}
                        />
                    }
                    isClearable
                />
                {timeError && (
                    <div className="validation-error">
                        <span>Toto pole je povinné.</span>
                    </div>
                )}

                {/* Price */}
                <label>Cena:</label>
                <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleInputChange}
                />

                {/* Location */}
                <label>Místo: *</label>
                <input
                    name="location"
                    value={form.location}
                    onChange={handleInputChange}
                    autoComplete="off"
                    required
                    className={locationError ? 'input-error' : ''}
                />
                {locationError && (
                    <div className="validation-error">
                        <span>Prosím vyberte konkrétní místo z nabídky.</span>
                    </div>
                )}
                {renderLocationSuggestions()}

                {/* Event URL */}
                <label>Odkaz na událost:</label>
                <input
                    type="url"
                    name="facebookUrl"
                    value={form.facebookUrl}
                    onChange={handleInputChange}
                />

                {/* Poster */}
                <label>Plakát:</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={isCompressing}
                />
                {isCompressing && (
                    <p className="compression-note">Probíhá komprese obrázku...</p>
                )}
                {compressionError && (
                    <p className="error-note">{compressionError}</p>
                )}

                {/* Submit */}
                <button type="submit" disabled={isSubmitting || isCompressing}>
                    {isSubmitting ? 'Odesílám...' : 'Odeslat'}
                </button>
            </form>

            {renderAuthModal()}
        </div>
    );
}