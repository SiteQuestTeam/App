import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Menu,
  X,
  MapPin,
  Camera,
  MessageSquare,
  Heart,
  Check,
  Wrench,
  Map,
  FileText,
  RotateCcw,
  ChevronRight,
  Users,
  Navigation,
  Coffee,
  Bike,
  Armchair,
  Info,
} from "lucide-react";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/manrope/wght.css";
import { initiatives as appInitiatives } from "../../src/data";
import { APP_URL, APP_CTA, asset } from "./config";
import "./styles.css";

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 120 90" aria-hidden="true">
      <circle cx="60" cy="18" r="12" />
      <circle className="accent" cx="28" cy="34" r="10" />
      <circle className="accent" cx="92" cy="34" r="10" />
      <path d="M22 64c8-19 24-29 38-29s30 10 38 29c-12 9-25 13-38 13S34 73 22 64Z" />
      <circle className="center" cx="60" cy="55" r="8" />
    </svg>
  );
}
function Logo() {
  return (
    <a className="logo" href="#top" aria-label="SiteQuest — początek strony">
      <Mark />
      <span>
        SiteQuest<span className="logo-dot">.</span>
      </span>
    </a>
  );
}
function Mascot({ pose, className = "", ...props }) {
  const dimensions = { wave: [478, 687], think: [598, 883], point: [578, 629] };
  return (
    <img
      className={`mascot ${className}`}
      src={asset(`beaver-${pose}.webp`)}
      width={dimensions[pose][0]}
      height={dimensions[pose][1]}
      alt="Bóbr SiteQuest w niebieskiej kamizelce i z fioletowym plecakiem"
      {...props}
    />
  );
}
function Cta({ onDemo, secondary = false, children }) {
  return APP_URL ? (
    <a
      className={`button ${secondary ? "secondary" : "primary"}`}
      href={APP_URL}
    >
      {children || APP_CTA}
      <ArrowUpRight size={20} />
    </a>
  ) : (
    <button
      className={`button ${secondary ? "secondary" : "primary"}`}
      onClick={onDemo}
    >
      {children || APP_CTA}
      <ArrowUpRight size={20} />
    </button>
  );
}
function MapDrawing({ className = "" }) {
  return (
    <svg
      className={`map-drawing ${className}`}
      viewBox="0 0 640 580"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="640" height="580" fill="#F0F3F7" />
      <path
        d="M15 5H225V126H180V226H0M370 20H620V185H493V144H370M430 359H640V574H422Z"
        fill="#E3EBE5"
      />
      <path
        d="M0 421C117 390 166 449 249 495S407 566 660 478"
        stroke="#D6E7F5"
        strokeWidth="47"
      />
      <g stroke="#DDE3EA" strokeWidth="28">
        <path d="M-50 332L700 178M128 -40L373 620M399 -30L285 590M-40 99L691 399" />
      </g>
      <g stroke="#FFF" strokeWidth="22">
        <path d="M-50 332L700 178M128 -40L373 620M399 -30L285 590M-40 99L691 399" />
      </g>
      <g fill="#E4E8EE" stroke="#F7F9FC" strokeWidth="5">
        <path d="M207 23h81v67h-81zM433 203h94v57h-94zM63 339h73v57H63zM431 402h61v76h-61zM482 291h91v42h-91zM81 164h44v94H81z" />
      </g>
      <ellipse
        cx="446"
        cy="125"
        rx="64"
        ry="40"
        fill="#FFF"
        stroke="#D7DEE7"
        strokeWidth="6"
      />
      <ellipse cx="446" cy="125" rx="45" ry="24" fill="#E6EAF1" />
      <path
        d="M248 375L289 290L389 265L417 197"
        stroke="#2F6BFF"
        strokeWidth="3"
        strokeDasharray="7 8"
      />
    </svg>
  );
}
function PhonePreview() {
  return (
    <figure className="phone-preview">
      <div className="phone-shell">
        <img
          src={asset("app-detail.webp")}
          width="390"
          height="844"
          alt="Rzeczywisty ekran aplikacji SiteQuest: inicjatywa stoisko z herbatą, licznik 9/10 głosów"
          fetchPriority="high"
        />
      </div>
      <figcaption>Ekran aplikacji · dane demo</figcaption>
    </figure>
  );
}
const steps = [
  {
    icon: Camera,
    title: "Zauważ miejsce.",
    copy: "Masz pomysł na swoją okolicę? Na miejscu zrób zdjęcie aparatem w aplikacji.",
    tag: "Zdjęcie + lokalizacja",
  },
  {
    icon: MessageSquare,
    title: "Nadaj pomysłowi kształt.",
    copy: "Odpowiedz na maksymalnie 3 pytania. Popraw krótki opis inicjatywy i zatwierdź go.",
    tag: "Twój pomysł, Twój głos",
  },
  {
    icon: Heart,
    title: "Zbierz poparcie.",
    copy: "Inicjatywa pojawia się na mapie. Sąsiedzi mogą oddać głos, będąc w pobliżu miejsca.",
    tag: "Głos na miejscu · ok. 50 m",
  },
];
function App() {
  const [menu, setMenu] = useState(false);
  const [demo, setDemo] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape" && menu) {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    const media = matchMedia("(min-width: 901px)");
    const reset = () => {
      if (media.matches) setMenu(false);
    };
    document.addEventListener("keydown", close);
    media.addEventListener("change", reset);
    return () => {
      document.removeEventListener("keydown", close);
      media.removeEventListener("change", reset);
    };
  }, [menu]);
  const openDemo = () => {
    setMenu(false);
    setDemo(true);
  };
  const links = [
    ["#jak-to-dziala", "Jak to działa"],
    ["#dwie-sciezki", "Pomysł czy usterka?"],
    ["#aplikacja", "Poznaj aplikację"],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <header className="header" id="top">
        <div className="container header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Nawigacja główna">
            {links.map(([href, title]) => (
              <a key={href} href={href}>
                {title}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <Cta onDemo={openDemo} />
            <button
              ref={menuButton}
              className="icon-button menu-button"
              aria-label={menu ? "Zamknij menu" : "Otwórz menu"}
              aria-expanded={menu}
              aria-controls="mobile-nav"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Nawigacja mobilna"
          hidden={!menu}
        >
          {links.map(([href, title]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {title}
              <ArrowUpRight size={18} />
            </a>
          ))}
        </nav>
      </header>
      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-pin">
                <MapPin size={14} />
              </span>{" "}
              MAŁY POMYSŁ. WSPÓLNA SPRAWA.
            </p>
            <h1 id="hero-title">
              Twoje miasto.
              <br />
              Twój pomysł.
              <br />
              <span>Wspólna zmiana.</span>
            </h1>
            <p className="hero-lead">
              Ta ławka. Ten skwer. Twoja okolica.
              <br className="wide-only" /> Zamień to, co zauważasz, w
              inicjatywę, którą mogą poprzeć sąsiedzi.
            </p>
            <div className="hero-actions">
              <Cta onDemo={openDemo} />
              <a className="text-link" href="#jak-to-dziala">
                Zobacz, jak to działa <ArrowDown size={18} />
              </a>
            </div>
            <p className="caption hero-note">
              Projekt HackYeah 2026 <span>·</span> Demo bez zakładania konta
            </p>
          </div>
          <div className="hero-scene">
            <div className="hero-map">
              <MapDrawing />
            </div>
            <div className="scene-coordinate">
              KRAKÓW / 50.067° N, 19.992° E
            </div>
            <div className="scene-note">
              <span>
                <MapPin size={18} />
              </span>
              <div>
                Każda zmiana
                <br />
                <strong>zaczyna się gdzieś.</strong>
              </div>
            </div>
            <PhonePreview />
            <Mascot pose="wave" className="hero-beaver" fetchPriority="high" />
            <span className="scene-label">
              <span className="little-dot" /> Twój przewodnik po okolicy
            </span>
          </div>
        </section>
        <div className="promise-strip">
          <div className="container">
            <span>
              <MapPin />
              Pomysły zakorzenione w miejscu
            </span>
            <span>
              <Users />
              Poparcie ludzi z okolicy
            </span>
            <span>
              <MessageSquare />
              Prosty opis zamiast pustej kartki
            </span>
          </div>
        </div>
        <section
          className="section container how-section"
          id="jak-to-dziala"
          aria-labelledby="how-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / OD ZAUWAŻENIA DO INICJATYWY</p>
              <h2 id="how-title">
                Dobre zmiany zaczynają się
                <br />
                od „a gdyby tak…”.
              </h2>
            </div>
            <p>
              Nie musisz mieć gotowego projektu.
              <br />
              Zacznij od miejsca i tego, co chcesz w nim zmienić.
            </p>
          </div>
          <ol className="steps">
            {steps.map(({ icon: Icon, title, copy, tag }, i) => (
              <li key={title}>
                <div className="step-top">
                  <span className="step-icon">
                    <Icon size={25} />
                  </span>
                  <span className="step-number">0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="step-tag">{tag}</span>
              </li>
            ))}
          </ol>
          <div className="guide-note">
            <div className="guide-portrait">
              <Mascot pose="think" loading="lazy" />
            </div>
            <p>
              <strong>Ty znasz okolicę. Bóbr pomoże ułożyć opis.</strong>
              <br />
              <span>
                W obecnym demo rozmowa jest symulacją. Docelowo AI dopyta o
                szczegóły — decyzja o publikacji zostaje po Twojej stronie.
              </span>
            </p>
            <a
              href="#przewodnik"
              className="icon-button"
              aria-label="Poznaj rolę bobra"
            >
              <ArrowDown />
            </a>
          </div>
        </section>
        <section
          className="paths-section"
          id="dwie-sciezki"
          aria-labelledby="paths-title"
        >
          <div className="container paths-grid">
            <div className="paths-intro">
              <p className="eyebrow">02 / DWIE RÓŻNE POTRZEBY</p>
              <h2 id="paths-title">
                {"Nowy pomysł? "}
                <br />A może coś
                <br />
                <span>nie działa?</span>
              </h2>
              <p>
                Obie sprawy są ważne.
                <br />
                Każda ma swoją drogę.
              </p>
              <svg
                className="branch-art"
                viewBox="0 0 260 90"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 45h90c60 0 40-30 100-30h40M95 45c60 0 40 30 100 30h40"
                  stroke="#BCCCF7"
                  strokeWidth="2"
                />
                <circle cx="8" cy="45" r="7" fill="#2F6BFF" />
                <circle cx="236" cy="15" r="7" fill="#2F6BFF" />
                <circle cx="236" cy="75" r="7" fill="#667085" />
              </svg>
            </div>
            <div className="path-cards">
              <article className="path-card initiative-path">
                <div className="path-icon">
                  <MapPin />
                </div>
                <div>
                  <p className="eyebrow">INICJATYWA MIESZKAŃCÓW</p>
                  <h3>„Przydałby się tu stojak na rowery”.</h3>
                  <p>
                    Propozycja zmiany, którą pokazujesz na mapie. Inni poznają
                    opis i mogą poprzeć ją głosem na miejscu.
                  </p>
                  <div className="path-flow">
                    <span>Zdjęcie i opis</span>
                    <ChevronRight />
                    <span>Mapa</span>
                    <ChevronRight />
                    <span>Głosy</span>
                  </div>
                  <p className="path-footnote">
                    Próg głosów to poparcie dla pomysłu, a nie potwierdzenie
                    jego realizacji.
                  </p>
                </div>
              </article>
              <article className="path-card incident-path">
                <div className="path-icon">
                  <Wrench />
                </div>
                <div>
                  <p className="eyebrow">USTERKA MIEJSKA</p>
                  <h3>„Ten chodnik wymaga naprawy”.</h3>
                  <p>
                    Osobne zgłoszenie do Krakowskiego Centrum Kontaktu (KCK).
                    Bez publicznej inicjatywy, głosowania i wybierania wydziału.
                  </p>
                  <div className="path-flow">
                    <span>Zdjęcie i adres</span>
                    <ChevronRight />
                    <span>Podgląd</span>
                    <ChevronRight />
                    <span>KCK</span>
                  </div>
                  <p className="path-footnote">
                    <Info size={16} /> Integracja planowana. Obecne demo nie
                    wysyła zgłoszeń do KCK.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section
          className="section container app-section"
          id="aplikacja"
          aria-labelledby="app-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / ZAJRZYJ DO ŚRODKA</p>
              <h2 id="app-title">
                Miejsce. Pomysł.
                <br />
                Ludzie, którzy są za.
              </h2>
            </div>
            <p>
              Sprawdź przykładową inicjatywę z aplikacji.
              <br />
              Jeden głos wystarczy, żeby zobaczyć zmianę statusu w demo.
            </p>
          </div>
          <div className="app-showcase">
            <div className="showcase-map">
              <MapDrawing />
              <span className="map-caption">
                <span className="little-dot" /> Schemat mapy · dane demo
              </span>
              <span className="map-place">
                Park Lotników
                <br />
                Polskich
              </span>
              <span className="arena-label">TAURON ARENA</span>
              <span className="map-pin pin-one">
                <Coffee size={20} />
              </span>
              <span className="map-pin pin-two">
                <Bike size={20} />
              </span>
              <span className="map-pin pin-three">
                <Armchair size={20} />
              </span>
              <div className="map-location">
                <Navigation size={18} />
                <span>Okolica TAURON Areny, Kraków</span>
              </div>
            </div>
            <div className="showcase-detail">
              <div className="detail-top">
                <span className="pill">Zbiera głosy</span>
                <span className="caption">PRZYKŁAD Z MVP</span>
              </div>
              <h3>{appInitiatives[0].brief.title}</h3>
              <p className="place-line">
                <MapPin size={16} />
                {appInitiatives[0].brief.place}
              </p>
              <div className="vote-heading">
                <span>Poparcie inicjatywy</span>
                <strong>
                  9<span>/10</span>
                </strong>
              </div>
              <div className="progress" role="img" aria-label="9 z 10 głosów">
                <span style={{ width: "90%" }} />
              </div>
              <p>{appInitiatives[0].brief.proposedAction}</p>
              <Cta onDemo={openDemo}>Sprawdź demo inicjatywy</Cta>
              <p className="caption">
                Głosowanie w podglądzie jest lokalną symulacją.
                <br />
                Nie wymaga GPS i nie zapisuje prawdziwych głosów.
              </p>
            </div>
          </div>
        </section>
        <section
          className="guide-section"
          id="przewodnik"
          aria-labelledby="guide-title"
        >
          <div className="container guide-grid">
            <div className="guide-visual">
              <div className="guide-orbit" />
              <Mascot pose="think" loading="lazy" />
              <div className="speech-bubble">
                A co chciałbyś
                <br />
                tu zmienić?
                <span />
              </div>
            </div>
            <div className="guide-copy">
              <p className="eyebrow">POZNAJ BOBRA SITEQUEST</p>
              <h2 id="guide-title">
                Od „mam pomysł”
                <br />
                do konkretnego opisu.
              </h2>
              <p>
                Nasz bóbr towarzyszy Ci w tworzeniu inicjatywy. Pomaga przejść
                od obserwacji do odpowiedzi: co zmieniamy, dla kogo i czego
                potrzebujemy?
              </p>
              <ul className="guide-list">
                <li>
                  <Check />
                  Maksymalnie 3 krótkie pytania
                </li>
                <li>
                  <Check />
                  Opis, który możesz poprawić
                </li>
                <li>
                  <Check />
                  Publikacja dopiero po Twoim zatwierdzeniu
                </li>
              </ul>
              <div className="status-note">
                <span className="status-label">STATUS DEMO</span>
                <p>
                  Rozmowa w aplikacji korzysta z przygotowanych pytań.
                  Połączenie z AI jest planowane. Punkty, nagrody i głosy
                  działają lokalnie.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          className="final-section container"
          aria-labelledby="final-title"
        >
          <div className="final-card">
            <div>
              <p className="eyebrow">NASTĘPNY KROK NALEŻY DO CIEBIE</p>
              <h2 id="final-title">
                Rozejrzyj się.
                <br />
                Tu może zacząć się coś dobrego.
              </h2>
              <Cta onDemo={openDemo} />
              <p className="caption">Poznaj demo. Pomyśl o swojej okolicy.</p>
            </div>
            <Mascot pose="point" loading="lazy" />
          </div>
        </section>
      </main>
      <footer className="container footer">
        <Logo />
        <p>Małe inicjatywy. Wspólne miasto.</p>
        <a
          href="https://github.com/SiteQuestTeam/App"
          target="_blank"
          rel="noreferrer"
        >
          Projekt na GitHubie <ArrowUpRight size={16} />
          <span className="sr-only"> (nowa karta)</span>
        </a>
        <span className="caption">HackYeah 2026</span>
      </footer>
      {demo && <Demo onClose={() => setDemo(false)} />}
    </>
  );
}
const demoIcons = { tea: Coffee, rack: Bike, bench: Armchair };
function Demo({ onClose }) {
  const dialog = useRef(null);
  const [items, setItems] = useState(() =>
    appInitiatives.map((item) => ({ ...item, hasVoted: false })),
  );
  const [selected, setSelected] = useState("tea");
  const [mode, setMode] = useState("initiative");
  const [message, setMessage] = useState("");
  const item = items.find((entry) => entry.id === selected);
  const isPassed = item.votes >= item.threshold;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const vote = () => {
    if (item.hasVoted || isPassed) return;
    setItems((current) =>
      current.map((entry) =>
        entry.id === selected
          ? { ...entry, votes: entry.votes + 1, hasVoted: true }
          : entry,
      ),
    );
    setMessage(
      item.votes + 1 >= item.threshold
        ? "Demo: 10/10. Inicjatywa osiągnęła próg poparcia. To nie oznacza, że została zrealizowana."
        : "Demo: Twój głos został dodany lokalnie. Możesz oddać jeden głos na tę inicjatywę.",
    );
  };
  const reset = () => {
    setItems(appInitiatives.map((entry) => ({ ...entry, hasVoted: false })));
    setMessage("Demo zostało zresetowane. Możesz spróbować ponownie.");
  };
  return (
    <dialog
      ref={dialog}
      className="demo-dialog"
      aria-labelledby="demo-title"
      aria-describedby="demo-disclaimer"
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = [
          ...event.currentTarget.querySelectorAll(
            "button:not(:disabled), a[href]",
          ),
        ].filter((element) => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="demo-header">
        <div>
          <p className="eyebrow">SITEQUEST / INTERAKTYWNY PODGLĄD</p>
          <h2 id="demo-title">Sprawdź, jak działa inicjatywa.</h2>
        </div>
        <button
          className="icon-button"
          autoFocus
          aria-label="Zamknij demo"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <p className="demo-disclaimer" id="demo-disclaimer">
        <Info size={18} />
        <span>
          Lokalna demonstracja na danych z aplikacji. Bez konta, GPS, aparatu,
          AI i wysyłania danych. Stan znika po zamknięciu.
        </span>
      </p>
      <div className="demo-tabs" role="group" aria-label="Wybierz ścieżkę">
        <button
          aria-pressed={mode === "initiative"}
          onClick={() => setMode("initiative")}
        >
          <Map size={18} />
          Inicjatywy
        </button>
        <button
          aria-pressed={mode === "incident"}
          onClick={() => setMode("incident")}
        >
          <Wrench size={18} />
          Ścieżka usterki
        </button>
      </div>
      {mode === "initiative" ? (
        <div className="demo-layout">
          <aside className="demo-sidebar" aria-label="Przykładowe inicjatywy">
            <p className="eyebrow">WYBIERZ INICJATYWĘ</p>
            {items.map((entry) => {
              const Icon = demoIcons[entry.id];
              return (
                <button
                  key={entry.id}
                  aria-pressed={selected === entry.id}
                  className="initiative-option"
                  onClick={() => {
                    setSelected(entry.id);
                    setMessage("");
                  }}
                >
                  <Icon size={22} />
                  <span>
                    {entry.shortTitle}
                    <small>
                      {entry.votes}/{entry.threshold} głosów ·{" "}
                      {entry.votes >= entry.threshold
                        ? "Przeszła"
                        : "Zbiera głosy"}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
            <button className="text-link reset-button" onClick={reset}>
              <RotateCcw size={16} />
              Zresetuj demo
            </button>
          </aside>
          <article className="demo-brief">
            <div className="detail-top">
              <span className="pill">
                {isPassed ? "Próg osiągnięty · demo" : "Zbiera głosy · demo"}
              </span>
              <span className="caption">{item.brief.category}</span>
            </div>
            <h3>{item.brief.title}</h3>
            <p className="place-line">
              <MapPin size={16} />
              {item.brief.place}
            </p>
            <div className="vote-heading">
              <span>Głosy</span>
              <strong>
                {item.votes}
                <span>/{item.threshold}</span>
              </strong>
            </div>
            <div
              className="progress"
              role="img"
              aria-label={`${item.votes} z ${item.threshold} głosów`}
            >
              <span
                style={{
                  width: `${Math.min(100, (item.votes / item.threshold) * 100)}%`,
                }}
              />
            </div>
            <dl className="brief-fields">
              <div>
                <dt>
                  <FileText size={16} />
                  Problem
                </dt>
                <dd>{item.brief.problem}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} />
                  Proponowane działanie
                </dt>
                <dd>{item.brief.proposedAction}</dd>
              </div>
              <div>
                <dt>
                  <Users size={16} />
                  Potrzebne zasoby
                </dt>
                <dd>{Object.values(item.brief.resources).join(" · ")}</dd>
              </div>
            </dl>
            <button
              className="button primary vote-button"
              onClick={vote}
              disabled={item.hasVoted || isPassed}
            >
              <Heart size={18} />
              {item.hasVoted
                ? "Głos oddany w demo"
                : isPassed
                  ? "Próg już osiągnięty"
                  : "Oddaj głos w demo"}
            </button>
            <p className="caption">
              W aplikacji głos wymaga obecności ok. 50 m od miejsca. Ten podgląd
              symuluje obecność. Próg nie jest potwierdzeniem realizacji.
            </p>
            <p className="demo-result" role="status">
              {message}
            </p>
          </article>
        </div>
      ) : (
        <div className="incident-demo">
          <span className="path-icon">
            <Wrench size={28} />
          </span>
          <h3>Usterka trafia inną drogą.</h3>
          <p>
            W aplikacji przygotujesz zdjęcie, adres i opis. Sprawdzisz dane
            przed świadomym wysłaniem do Krakowskiego Centrum Kontaktu.
          </p>
          <ol>
            <li>Zdjęcie na miejscu i lokalizacja</li>
            <li>Sprawdzenie kategorii, adresu i opisu</li>
            <li>Wysyłka do KCK po podłączeniu integracji</li>
          </ol>
          <div className="status-note">
            <strong>Wysyłka nie jest jeszcze podpięta.</strong>
            <p>
              Ten podgląd niczego nie zgłasza. Potwierdzeniem będzie dopiero
              numer zgłoszenia z KCK. Usterki nie zbierają głosów.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setMode("initiative")}
          >
            Wróć do demo inicjatyw
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </dialog>
  );
}
createRoot(document.getElementById("root")).render(<App />);
