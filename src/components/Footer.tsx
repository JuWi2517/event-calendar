import "../css/PublicPage.css"
import {Link} from "react-router-dom";
export default function Footer() {
    return (
        <section className="footer">
            <div className="footer-container">
                <p className="footer-text">
                    Web vytvořil: Jan Richter
                    <span className="separator">•</span>
                    <Link className="footer-link" to="/gdpr">GDPR</Link>
                    <span className="separator">•</span>
                    Tento web nepoužívá žádné cookies.
                    <span className="separator">•</span>
                    Fotky od: <a
                    href="https://www.instagram.com/ipetrivalska?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                >
                    Ivana Petřivalská
                </a>
                </p>
            </div>
        </section>
    );
}