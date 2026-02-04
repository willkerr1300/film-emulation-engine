import { useEffect, useState, useRef } from 'react'
import './App.css'
// import init, { EmulationEngine } from './wasm-mock';
import init, { EmulationEngine } from 'film-emulation-engine';
import FilmCanvas from './components/FilmCanvas';

import { FILM_PRESETS } from './presets';

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const engineRef = useRef<EmulationEngine | null>(null);

  // Film State
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    init().then(() => {
      setIsWasmLoaded(true);
      // Initialize engine with dummy dimensions
      engineRef.current = EmulationEngine.new(800, 600);
    }).catch(console.error);
  }, []);

  return (
    <div className="app-container">
      <h1 className="main-title">Film Emulation Engine</h1>

      <div className="upload-section">
        <label className="upload-btn">
          Upload Photo
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
        <p className="status-text">{isWasmLoaded ? 'Core Ready' : 'Loading Core...'}</p>
      </div>

      <div className="film-grid">
        {FILM_PRESETS.map((preset) => (
          <div key={preset.name} className="film-card">
            <div className="film-header">
              <h3>{preset.label}</h3>
              <p>{preset.description}</p>
            </div>

            {imageSrc ? (
              <FilmCanvas
                imageSrc={imageSrc}
                preset={preset}
              />
            ) : (
              <div className="placeholder-tile" style={{ backgroundColor: preset.color }}>
                <span className="stock-name">{preset.name.toUpperCase()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
