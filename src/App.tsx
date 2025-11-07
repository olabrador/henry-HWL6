import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Contact from "./pages/Contact";

function App() {
  const [currentPage, setCurrentPage] = useState("Inicio");

  const renderPage = () => {
    switch (currentPage) {
      case "Inicio":
        return <Home />;
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
      <main className="main-content">{renderPage()}</main>
      <footer className="footer">
        <p>© 2025 Mi Sitio. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
