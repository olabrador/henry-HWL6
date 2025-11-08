interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const pages = ['Inicio', 'Productos', 'Servicios', 'Contacto'];

  return (
    <nav className="navbar" role="navigation" aria-label="Navegación principal">
      <div className="nav-brand">Mi Sitio</div>
      <ul className="nav-menu" role="list">
        {pages.map((page) => (
          <li key={page} role="listitem">
            <button
              className={currentPage === page ? 'nav-link active' : 'nav-link'}
              onClick={() => onNavigate(page)}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Ir a la página ${page}`}
            >
              {page}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navbar;

