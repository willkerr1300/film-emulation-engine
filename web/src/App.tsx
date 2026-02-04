import { useEffect, useState, useRef } from 'react'
import './App.css'
// import init, { EmulationEngine } from './wasm-mock';
import init, { EmulationEngine } from 'film-emulation-engine';
import FilmCanvas from './components/FilmCanvas';

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const engineRef = useRef<EmulationEngine | null>(null);

  // Film State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [grainIntensity, setGrainIntensity] = useState(0.3);
  const [halationIntensity, setHalationIntensity] = useState(0.5);

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
      <h1>Film Emulation Engine</h1>
      <div className="card">
        {/* Basic WASM check for potential future Rust modules */}
        <p style={{ fontSize: '0.8em', color: '#666' }}>Engine Status: {isWasmLoaded ? 'Ready' : 'Initializing...'}</p>

        <div className="controls">
          <div className="control-group">
            <label>Upload Photo</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="control-group">
            <label>Grain Intensity: {grainIntensity}</label>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={grainIntensity}
              onChange={(e) => setGrainIntensity(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Halation: {halationIntensity}</label>
            <input
              type="range"
              min="0" max="2" step="0.1"
              value={halationIntensity}
              onChange={(e) => setHalationIntensity(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <FilmCanvas
            imageSrc={imageSrc}
            grainIntensity={grainIntensity}
            halationIntensity={halationIntensity}
          />
        </div>
      </div>
    </div>
  )
}

export default App
