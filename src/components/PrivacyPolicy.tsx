import React, {useEffect} from 'react';
import "../css/PrivacyPolicy.css"




interface PrivacyPolicyProps {
    siteName?: string;
    ownerName?: string;
    ico?: string;
    contactEmail?: string;
    lastUpdated?: string;
    className?: string;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
                                                         siteName = "planujlouny.cz",
                                                         ownerName = "Jan Richter",
                                                         contactEmail = "jenik.richter@gmail.com",
                                                         lastUpdated = "11.1.2026",
                                                         className = "privacy-policy"
                                                     }) => {

    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = "robots";
        meta.content = "noindex, nofollow";

        document.head.appendChild(meta);

        return () => {
            document.head.removeChild(meta);
        };
    }, []);
    return (
        <div className={className}>
            <header>
                <h1>Zásady ochrany osobních údajů</h1>
                <p>Naposledy aktualizováno: {lastUpdated}</p>
            </header>

            <div>
                {/* Úvod */}
                <section>
                    <p>
                        Tyto zásady ochrany osobních údajů popisují, jakým způsobem jsou
                        zpracovávány osobní údaje na webu <strong>{siteName}</strong>.
                        Cílem webu je provoz kulturního a společenského kalendáře s
                        minimálním dopadem na soukromí uživatelů.
                    </p>
                </section>

                {/* 1. Správce */}
                <section>
                    <h2>1. Správce osobních údajů</h2>
                    <p>Správcem osobních údajů je:</p>
                    <ul>
                        <li>{ownerName}</li>
                        <li>
                            Kontakt:{" "}
                            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                        </li>
                    </ul>
                </section>

                {/* 2. Zpracovávaná data */}
                <section>
                    <h2>2. Jaká data zpracováváme a proč</h2>
                    <p>
                        Osobní údaje zpracováváme pouze v rozsahu nezbytném pro technické
                        fungování webu a umožnění přidávání a správy kulturních událostí.
                    </p>
                    <ul>
                        <li>
                            <strong>Registrační a přihlašovací údaje:</strong>
                            Pro vytvoření uživatelského účtu využíváme službu{" "}
                            <strong>Google Firebase Authentication</strong>.
                            Zpracovávána je e-mailová adresa a unikátní identifikátor
                            uživatele (UID).
                            <br />
                            <strong>
                                Hesla uživatelů nejsou provozovatelem webu ukládána ani
                                zpřístupněna.
                            </strong>{" "}
                            Hesla jsou zpracovávána výhradně službou Firebase v podobě
                            kryptografického hashe.
                        </li>
                        <li>
                            <strong>Přihlášení přes Google:</strong>
                            Pokud se přihlásíte pomocí účtu Google, může být zpracováno
                            vaše jméno a URL profilové fotografie, které slouží pouze
                            k zobrazení ve vašem uživatelském profilu.
                        </li>
                        <li>
                            <strong>Údaje o událostech:</strong>
                            Informace vložené do formuláře „Přidejte vaši událost“
                            (název, datum, místo, popis, plakát) jsou považovány za veřejné
                            informace o kulturní akci. Nejedná se o osobní údaje, pokud
                            do obsahu sami nevložíte informace soukromé povahy.
                        </li>
                        <li>
                            <strong>Technická a analytická data:</strong>
                            K anonymnímu měření návštěvnosti používáme službu{" "}
                            <strong>Vercel Analytics</strong>, která nepoužívá
                            sledovací cookies ani neukládá IP adresy v podobě umožňující
                            identifikaci konkrétní osoby.
                        </li>
                    </ul>
                </section>

                {/* 3. Zpracovatelé */}
                <section>
                    <h2>3. Komu data předáváme (zpracovatelé)</h2>
                    <p>
                        Osobní údaje uživatelů nikomu neprodáváme. Pro technický provoz
                        webu využíváme následující poskytovatele služeb:
                    </p>
                    <ul>
                        <li>
                            <strong>Google Ireland Limited</strong> (Firebase Authentication,
                            Firestore, Storage) – zajišťuje autentizaci uživatelů,
                            databázi a ukládání obrázků. V rámci těchto služeb může docházet
                            k přenosu osobních údajů mimo EU, a to na základě standardních
                            smluvních doložek (SCC).
                        </li>
                        <li>
                            <strong>Vercel Inc.</strong> – zajišťuje hosting webové aplikace
                            a anonymní analytiku.
                        </li>
                    </ul>
                </section>

                {/* 4. Cookies */}
                <section>
                    <h2>4. Cookies</h2>
                    <p>
                        Web používá pouze nezbytně nutné technické cookies související
                        s přihlášením uživatele, které zajišťuje služba Firebase.
                        Nepoužíváme žádné marketingové ani reklamní cookies.
                    </p>
                </section>

                {/* 5. Práva */}
                <section>
                    <h2>5. Práva subjektu údajů</h2>
                    <p>Podle nařízení GDPR máte právo:</p>
                    <ul>
                        <li>na přístup ke svým osobním údajům,</li>
                        <li>na opravu nepřesných údajů,</li>
                        <li>
                            na výmaz osobních údajů (právo „být zapomenut“) – v případě
                            zrušení uživatelského účtu,
                        </li>
                        <li>vznést námitku proti zpracování.</li>
                    </ul>
                </section>

                {/* 6. Právní základ */}
                <section>
                    <h2>6. Právní základ zpracování</h2>
                    <ul>
                        <li>
                            <strong>Plnění smlouvy</strong> – zpracování údajů nutných k
                            vytvoření a správě uživatelského účtu.
                        </li>
                        <li>
                            <strong>Oprávněný zájem správce</strong> – zajištění bezpečného
                            a funkčního provozu webu.
                        </li>
                        <li>
                            <strong>Souhlas</strong> – v případě přihlášení pomocí účtu Google.
                        </li>
                    </ul>
                </section>

                {/* 7. Uchování */}
                <section>
                    <h2>7. Doba uchování osobních údajů</h2>
                    <p>
                        Osobní údaje uchováváme po dobu existence uživatelského účtu.
                        Po jeho zrušení jsou osobní údaje bez zbytečného odkladu smazány,
                        pokud neexistuje zákonný důvod pro jejich další uchování.
                    </p>
                </section>

                {/* 8. Stížnosti */}
                <section>
                    <h2>8. Právo podat stížnost</h2>
                    <p>
                        Pokud se domníváte, že zpracováním vašich osobních údajů dochází
                        k porušení právních předpisů, máte právo podat stížnost u{" "}
                        <strong>Úřadu pro ochranu osobních údajů</strong> (www.uoou.cz).
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
