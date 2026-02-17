import { lazy } from 'react';
import PhotoCarousel from '../components/PhotoCarousel';
import LoadOnScroll from '../components/LoadOnScroll';
import '../css/PublicPage.css';
import img9903 from '../assets/Photos/DSC_9903-Enhanced-NR.webp';
import img9166 from '../assets/Photos/DSC_9166-Enhanced-NR.webp';
import img3182 from '../assets/Photos/DSC_3182-Enhanced-NR.webp';

const carouselImages = [
    img9903,
    img9166,
    img3182,
];

const EventForm = lazy(() => import('../components/EventForm'));
const CalendarView = lazy(() => import('../components/CalendarView'));

export default function PublicPage() {
    return (
        <div className="public-page bg">
            <PhotoCarousel
                images={carouselImages}
                title="Kalendář akcí v Lounech"
                subtitle="PlanujLouny je koordinační kalendář akcí v Lounech určený především organizátorům akcí v Lounech. Jeho cílem je přehledné plánování, omezení kolizí termínů a lepší vzájemná domluva mezi pořadateli. "
            />

            <main className="page-content">
                <section className="calendar-section">
                    <CalendarView />
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