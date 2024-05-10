import { useEffect, useState } from 'react';
import '../css/EventFetching.css';

const EventFetching = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${import.meta.env.VITE_CALENDAR_ID}/events?key=${import.meta.env.VITE_GOOGLE_API_KEY}`);
                const data = await response.json();
                const currentDateTime = new Date().toISOString(); // Get current date and time in ISO format
                const futureEvents = data.items.filter(event => event.end.dateTime > currentDateTime); // Filter out past events

                for (const event of futureEvents) {
                    if (event.location) {
                        try {
                            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(event.location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
                            const data = await response.json();
                            const location = data.results[0].geometry.location;
                            event.lat = location.lat;
                            event.lng = location.lng;
                        } catch (error) {
                            console.error('Chyba při načítání souřadnic místa:', error);
                        }
                    }
                }

                setEvents(futureEvents);
            } catch (error) {
                console.error('Chyba při načítání událostí z Google Kalendáře:', error);
            }
        };

        fetchEvents();
    }, []);

    const dateTimeFormat = new Intl.DateTimeFormat('cz', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    return (
        <div>
            {events.map((event, index) => (
                <div key={index} className="event-card">
                    <h2>{event.summary}</h2>
                    <p>{event.description}</p>
                    <p>Začátek: {dateTimeFormat.format(new Date(event.start.dateTime))}</p>
                    <p>Konec: {dateTimeFormat.format(new Date(event.end.dateTime))}</p>
                    {event.location ? (
                        <>
                            <p>Místo: {event.location}</p>
                            {event.lat && event.lng && (
                                <p>
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`} target="_blank" rel="noopener noreferrer">
                                        Zobrazit na Google Maps
                                    </a>
                                </p>
                            )}
                        </>
                    ) : (
                        <p>Místo: Není dostupné</p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default EventFetching;