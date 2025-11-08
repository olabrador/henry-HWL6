import { useState } from "react";

function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="page">
      <h1>Bienvenido</h1>
      <p className="description">
        Esta es una aplicación de ejemplo creada con Vite y React
      </p>
      <div className="card">
        <h2>Contador Interactivo</h2>
        <button 
          className="counter-btn" 
          onClick={() => setCount(count + 1)}
          aria-label={`Contador de clicks. Actualmente: ${count} clicks`}
        >
          Clicks: {count}
        </button>
      </div>
      <div className="features" role="list">
        <div className="feature-card" role="listitem">
          <h3>
            <span aria-hidden="true">⚡</span> Rápido
          </h3>
          <p>Desarrollo ultrarrápido con Vite</p>
        </div>
        <div className="feature-card" role="listitem">
          <h3>
            <span aria-hidden="true">🎨</span> Moderno
          </h3>
          <p>Interfaz limpia y atractiva</p>
        </div>
        <div className="feature-card" role="listitem">
          <h3>
            <span aria-hidden="true">🚀</span> Eficiente
          </h3>
          <p>Optimizado para producción</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
