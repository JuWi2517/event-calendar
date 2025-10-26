import React from 'react';
import CalendarView from '../components/CalendarView';
import EventForm from '../components/EventForm';
import HeroCarousel from '../components/PhotoCarousel';
import '../css/PublicPage.css';


export default function PublicPage() {
    return (

            <div className="public-page bg">
                <HeroCarousel
                    images={[
                        'src/Photos/DSC_9627-Enhanced-NR.jpg',
                        'src/Photos/DSC_9903-Enhanced-NR.jpg',
                        'src/Photos/DSC_0323-Enhanced-NR.jpg',
                        'src/Photos/DSC_9694-Enhanced-NR.jpg',

                    ]}
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
