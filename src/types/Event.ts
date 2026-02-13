export interface Event {
    id?: string;
    title: string;
    category: string;
    startDate: string;
    endDate?: string;
    start: string;
    end?: string;
    location: string;
    lat: number;
    lng: number;
    price: string;
    facebookUrl?: string;
    posterUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    posterPath: string;
    resizedPosterPath: string;
    organizer?: string;
}