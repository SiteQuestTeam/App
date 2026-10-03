import React from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, X } from 'lucide-react';
import './styles.css';

const steps = [
  { no: '01', tag: 'ZWIAD', title: 'Zauważ', copy: 'Zrób zdjęcie miejsca z potencjałem. Borys rozpozna kontekst i pomoże opisać inicjatywę.' },
  { no: '02', tag: 'POPARCIE', title: 'Zbierz ludzi', copy: 'Poparcie sąsiadów zmienia Zwiad w Rajd mieszkańców albo Misję dla miasta.' },
  { no: '03', tag: 'REALIZACJA', title: 'Zmień miejsce', copy: 'Partnerzy dostarczają zasoby. Po wspólnej akcji miejsce na mapie zmienia status.' },
];

function Mark({ dark = false }) {
  return <svg className={`brand-mark ${dark ? 'on-dark' : ''}`} viewBox="0 0 120 90" aria-label="SiteQuest">
    <circle cx="60" cy="18" r="12"/><circle className="accent" cx="28" cy="34" r="10"/><circle className="accent" cx="92" cy="34" r="10"/>
    <path d="M22 64c8-19 24-29 38-29s30 10 38 29c-12 9-25 13-38 13S34 73 22 64Z"/><circle className="center" cx="60" cy="55" r="8"/>
  </svg>;
}
function Logo({ dark = false }) { return <a className="logo" href="#top"><Mark dark={dark}/><b>SiteQuest</b></a>; }

function App() {
  const [menu, setMenu] = React.useState(false);
  return <main id="top">
    <header><Logo dark/><nav className={menu ? 'open' : ''}><a href="#jak">Jak działa</a><a href="#borys">Borys</a><a href="#gildie">Gildie</a><a href="#korzysci">Korzyści</a></nav><button className="menu" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X/> : <Menu/>}</button></header>

    <section className="hero">
      <div className="grid-lines"/><div className="hero-copy"><p className="kicker light">MIASTO TO TWOJA PLANSZA</p><h1>Zamień swoje miasto<br/>w planszę do gry.</h1><p className="hero-accent">Kreuj zmiany, nie usterki.</p><p className="lead">Zgłaszaj Zwiady, twórz sąsiedzkie Rajdy i zmieniaj przestrzeń wokół siebie przy wsparciu Borysa.</p><a className="primary-button" href="http://localhost:8081">Przetestuj aplikację MVP</a></div>
      <Phone/>
      <img className="beaver hero-beaver" src="/borys.svg" alt="Bóbr Borys"/>
    </section>

    <section className="timeline-section" id="jak">
      <div className="section-heading"><p className="kicker">JAK DZIAŁA SIDEQUEST?</p><h2>Trzy kroki od pomysłu do zmiany</h2></div>
      <div className="timeline">{steps.map((step, i) => <article key={step.no} className="timeline-step"><div className="timeline-node">{step.no}</div><div className="timeline-copy"><small>{step.tag}</small><h3>{step.title}</h3><p>{step.copy}</p></div>{i < 2 && <div className="timeline-line"/>}</article>)}</div>
      <img className="beaver timeline-beaver" src="/borys.svg" alt="Borys wskazuje kolejny krok"/>
    </section>

    <section className="borys-section" id="borys">
      <div className="borys-copy"><p className="kicker light">BÓBR BORYS · ASYSTENT MIESZKAŃCA</p><h2>Mniej formularzy.<br/>Więcej działania.</h2><p>Borys ogląda zdjęcie, dopytuje o pomysł i porządkuje go w gotowy Brief Projektu. Zamiast zaczynać od urzędowego języka, zaczynasz od tego, co widzisz na swojej ulicy.</p></div>
      <div className="dialog-scene"><img className="beaver dialog-beaver" src="/borys.svg" alt="Bóbr Borys"/><div className="dialog"><b>Borys</b><p>Co powinno wydarzyć się na tym skwerze?</p><button>Miejsce odpoczynku</button><button>Ogród społeczny</button></div><div className="brief-sheet"><span>BRIEF / 0042</span><h3>Zielony skwer</h3><dl><div><dt>CEL</dt><dd>Miejsce odpoczynku</dd></div><div><dt>POTRZEBA</dt><dd>8 osób · 4 ławki</dd></div><div><dt>PARTNER</dt><dd>Gildia lokalna</dd></div></dl></div></div>
    </section>

    <section className="guild-section" id="gildie">
      <div className="section-heading narrow"><p className="kicker">EKOSYSTEM GILDII</p><h2>Połącz siły z partnerami w Twojej okolicy</h2><p>Każdy wnosi konkretny element. SideQuest pokazuje, czego brakuje i kto może wypełnić dany slot.</p></div>
      <div className="guild-map">
        <div className="connector c1"/><div className="connector c2"/><div className="connector c3"/>
        <div className="guild-node business"><span>01</span><b>Lokalny biznes</b><p>materiały · transport</p></div>
        <div className="guild-node ngo"><span>02</span><b>NGO</b><p>wiedza · wolontariusze</p></div>
        <div className="guild-node city"><span>03</span><b>Miasto</b><p>zgody · infrastruktura</p></div>
        <div className="guild-center"><Mark/><b>RAJD</b><small>Zielony skwer</small></div>
        <img className="beaver guild-beaver" src="/borys.svg" alt="Borys przy inicjatywie"/>
      </div>
    </section>

    <section className="impact-section" id="korzysci">
      <div className="impact-title"><p className="kicker light">TWÓJ ŚLAD W MIEŚCIE</p><h2>Widać, co naprawdę zrobiłeś.</h2><p>Historia aktywności nie jest kolejnym rankingiem. To zapis miejsc, ludzi i efektów, do których dołożyłeś swoją pracę.</p></div>
      <div className="impact-ledger"><div className="ledger-row head"><span>AKCJA</span><span>EFEKT</span><span>STATUS</span></div><div className="ledger-row"><b>Zwiad przy ul. Mogilskiej</b><span>12 potwierdzeń</span><em>Misja miasta</em></div><div className="ledger-row"><b>Rajd: Zielony skwer</b><span>18 uczestników</span><em className="done">Zrealizowane</em></div><div className="ledger-row"><b>Pomoc w bibliotece</b><span>6 sąsiadów</span><em>Misja</em></div></div>
      <img className="beaver impact-beaver" src="/borys.svg" alt="Borys"/>
    </section>

    <footer><Logo dark/><p>Miasto zmieniają ludzie, którzy wychodzą z domu.</p><small>HackYeah 2026</small></footer>
  </main>;
}

function Phone() { return <div className="phone-stage"><div className="phone"><div className="phone-notch"/><div className="app-map"><div className="fake-road road-a"/><div className="fake-road road-b"/><div className="search">⌕ <span>Szukaj ulicy lub działania</span><i>≡</i></div><div className="role"><b>Gracz</b><span>NGO</span></div><div className="points">● 860 PKT</div><div className="map-action">⌖</div><div className="marker z">Z</div><div className="marker r">R</div><div className="marker m">M</div><div className="player-zone"/><img className="phone-beaver" src="/borys.svg" alt=""/><div className="initiative"><div className="initiative-mark">R</div><div><small>RAJD <i>850 m</i></small><b>Ogród społeczny</b><span>Sobota, 10:00 · 9 osób</span></div><strong>›</strong></div><div className="fab">+</div><div className="bottom-nav"><b>⌖<small>Mapa</small></b><span>◇<small>Odkryj</small></span><span/><span>♙<small>Ekipa</small></span><span>○<small>Profil</small></span></div></div></div></div>; }

createRoot(document.getElementById('root')).render(<App/>);
