import React from "react";
import CalendarView from '../components/CalendarView';
import EventForm from '../components/EventForm';
import HeroCarousel from '../components/PhotoCarousel';
import '../css/PublicPage.css';


import img1 from '../Photos/DSC_0549-Enhanced-NR.jpg';
import img2 from '../Photos/DSC_9903-Enhanced-NR.jpg';
import img3 from '../Photos/DSC_3193-Enhanced-NR.jpg';
import img4 from '../Photos/DSC_9694-Enhanced-NR.jpg';


const carouselImages = [img2, img1, img3, img4];


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
                    <CalendarView />
                </section>

                <section className="form-section">
                    <h2 className="separator-with-lines">Něco vám tu chybí?</h2>
                    <div className="form-shell">
                        <EventForm onSuccess={() => alert('Díky za podání!')} />
                    </div>
                </section>
            </main>
        </div>
    );
}