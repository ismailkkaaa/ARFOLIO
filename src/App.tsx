import { useState } from 'react';
import ARExperience from './components/ARExperience';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <main className="app-shell">
      {!started ? (
        <section className="launch-screen">
          <div className="launch-grid" />
          <div className="brand-mark">ARFOLIO</div>
          <h1>SCAN BUSINESS CARD</h1>
          <p>Point your camera at the card</p>
          <button className="primary-action" type="button" onClick={() => setStarted(true)}>
            START AR EXPERIENCE
          </button>
        </section>
      ) : (
        <ARExperience />
      )}
    </main>
  );
}
