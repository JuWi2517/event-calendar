import EventFetching from "./components/eventFetching.jsx";
import EventRequestForm from "./components/EventRequestForm.jsx";

function HomePage(){
    return (
        <div>

            <EventFetching/>
            <EventRequestForm/>
        </div>
    )
}
export default HomePage;