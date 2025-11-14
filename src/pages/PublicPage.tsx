import React, { lazy } from 'react';
// 1. IMPORT CalendarView byl ODSTRANĚN ODTUD
import HeroCarousel from '../components/PhotoCarousel';
import LoadOnScroll from '../components/LoadOnScroll';
import '../css/PublicPage.css';
import img9903 from '../assets/photos/DSC_9903-Enhanced-NR.webp';
import img3193 from '../assets/photos/DSC_3193-Enhanced-NR.webp';
import img9694 from '../assets/photos/DSC_9694-Enhanced-NR.webp';


const carouselImages = [
    img9903,
    img3193,
    img9694,
];

const EventForm = lazy(() => import('../components/EventForm'));
const CalendarView = lazy(() => import('../components/CalendarView')); // <-- TOTO JE TA OPRAVA

export default function PublicPage(): React.ReactElement {
    return (
        <div className="public-page bg">
            <HeroCarousel
                images={carouselImages}
                title="Kalendář akcí v Lounech"
                subtitle="Kulturní a společenské události v Lounech"
            />

            <main className="page-content">
                <section className="calendar-section">
                    <LoadOnScroll
                        fallback={
                            <div style={{ minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#ccc' }}>
                                Nahrávám kalendář...
                            </div>
                        }
                    >
                        <CalendarView />
                    </LoadOnScroll>

                </section>

                <section className="form-section">
                    <h2 className="separator-with-lines">Něco vám tu chybí?</h2>
                    <div className="form-shell">
                        <LoadOnScroll fallback={<div>Načítám formulář...</div>}>
                            <EventForm onSuccess={() => alert('Díky za podání!')} />
                        </LoadOnScroll>

                    </div>
                </section>
            </main>
        </div>
    );
}