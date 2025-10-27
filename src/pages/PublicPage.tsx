import React from "react";
import CalendarView from '../components/CalendarView';
import EventForm from '../components/EventForm';
import HeroCarousel from '../components/PhotoCarousel';
import '../css/PublicPage.css';


import img1 from '../Photos/DSC_9627-Enhanced-NR.jpg';
import img2 from '../Photos/DSC_9903-Enhanced-NR.jpg';
import img3 from '../Photos/DSC_0323-Enhanced-NR.jpg';
import img4 from '../Photos/DSC_9694-Enhanced-NR.jpg';


const carouselImages = [img1, img2, img3, img4];


export default function PublicPage(): React.ReactElement {
    return (

        <div className="public-page bg">
            <HeroCarousel
                // 3. Pass the new array to the 'images' prop.
                images={carouselImages}
                title="Kalendář akcí"
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