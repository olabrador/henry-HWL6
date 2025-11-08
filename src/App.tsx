import { useState, Suspense, lazy } from "react";
import "./App.css";
import Navbar from "./components/Navbar";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));

function App() {
  const [currentPage, setCurrentPage] = useState("Inicio");

  const renderPage = () => {
    switch (currentPage) {
      case "Inicio":
        return <Products />;
      case "Productos":
        return <Products />;
      case "Servicios":
        return <Services />;
      case "Contacto":
        return <Contact />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main id="main-content" className="main-content" role="main">
        <Suspense fallback={<div className="loading">Cargando...</div>}>
          {renderPage()}
        </Suspense>
      </main>
      <footer className="footer" role="contentinfo">
        <p>© 2025 Mi Sitio. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
