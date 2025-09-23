export interface Event {
    id?: string;
    title: string;
    category: string;
    date: string;    // YYYY-MM-DD
    start: string;   // HH:mm
    location: string;
    lat: number;
    lng: number;
    price: string;
    facebookUrl?: string;
    posterUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
}