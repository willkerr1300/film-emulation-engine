import { useEffect, useState, useRef } from 'react'
import './App.css'
// import init, { EmulationEngine } from './wasm-mock';
import init, { EmulationEngine } from 'film-emulation-engine';
import GrainCanvas from './components/GrainCanvas';

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const engineRef = useRef<EmulationEngine | null>(null);

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
        <p>WASM Status: {isWasmLoaded ? <span style={{ color: 'green' }}>Loaded</span> : <span style={{ color: 'orange' }}>Loading...</span>}</p>

        <div className="controls">
          <button disabled={!isWasmLoaded}>Apply Grain</button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>WebGL Grain Shader</h3>
          <GrainCanvas intensity={0.5} />
        </div>
      </div>
    </div>
  )
}

export default App
