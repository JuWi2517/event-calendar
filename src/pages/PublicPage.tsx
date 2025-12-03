import { lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import HeroCarousel from '../components/PhotoCarousel';
import LoadOnScroll from '../components/LoadOnScroll';
import '../css/PublicPage.css';
import img9903 from '../assets/Photos/DSC_9903-Enhanced-NR.webp';
import img3193 from '../assets/Photos/DSC_3193-Enhanced-NR.webp';
import img9694 from '../assets/Photos/DSC_9694-Enhanced-NR.webp';

const carouselImages = [
    img9903,
    img3193,
    img9694,
];

const EventForm = lazy(() => import('../components/EventForm'));
const CalendarView = lazy(() => import('../components/CalendarView'));

export default function PublicPage() {
    return (
        <div className="public-page bg">

            <Helmet>
                <title>Kalendář akcí Louny | Kulturní přehled</title>
                <meta name="description" content="Aktuální přehled kulturních a společenských akcí v Lounech. Koncerty, divadla, výstavy a další události na jednom místě." />
                <meta name="keywords" content="Louny, kalendář akcí, kultura, divadlo, koncerty" />
                <link rel="canonical" href="https://event-calendar-taupe.vercel.app/" />
            </Helmet>

            <HeroCarousel
                images={carouselImages}
                title="Kalendář akcí v Lounech"
                subtitle="Kulturní a společenské události v Lounech"
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
            <section className="footer">
                <div className="footer-container">
                    <p className="footer-text">
                        Web vytvořil: Jan Richter
                        <span className="separator">•</span>
                        Tento web nepoužívá žádné cookies.
                        <span className="separator">•</span>
                        Fotky od: <a href="https://www.instagram.com/ipetrivalska?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="footer-link">Ivana Petřivalská</a>
                    </p>
                </div>
            </section>
        </div>
    );
}