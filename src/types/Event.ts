export interface Event {
    id?: string;
    title: string;
    category: string;
    startDate: string; // YYYY-MM-DD (Should NOT be 'date')
    endDate?: string;  // YYYY-MM-DD (The '?' makes it optional)
    start: string;     // HH:mm
    location: string;
    lat: number;
    lng: number;
    price: string;
    facebookUrl?: string;
    posterUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    posterPath: string;
    resizedPosterPath: string;
}