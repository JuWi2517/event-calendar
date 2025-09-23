import React from 'react';
import CalendarView from '../components/CalendarView';
import EventForm from '../components/EventForm';
import HeroCarousel from '../components/PhotoCarousel';
import '../css/PhotoCarousel.css';

export default function PublicPage() {
    return (
        <div className="public-page">
            {/* Hero with carousel + header overlay */}
            <HeroCarousel
                images={[
                    // put your real URLs here (Storage, CDN, local /public)
                    'src/Photos/DSC_9627-Enhanced-NR.jpg',
                    'src/Photos/DSC_9903-Enhanced-NR.jpg',
                    'src/Photos/DSC_0323-Enhanced-NR.jpg',
                ]}
                title="Kalendář akcí"
                subtitle="Kulturní a společenské události v Lounech"
                // waveColor defaults to the page background; override if needed:
                // waveColor="var(--bg)"
            />

            <main className="page-content" style={{ marginTop: '18px' }}>
                <section className="calendar-section">
                    <CalendarView />
                </section>

                <section className="form-section" style={{ marginTop: '28px' }}>
                    <h2 className="form-title">Přidat akci</h2>
                    <div className="form-shell">
                        <EventForm onSuccess={() => alert('Díky za podání!')} />
                    </div>
                </section>
            </main>
        </div>
    );
}
