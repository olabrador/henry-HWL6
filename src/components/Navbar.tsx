interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const pages = ['Inicio', 'Productos', 'Servicios', 'Contacto'];

  return (
    <nav className="navbar">
      <div className="nav-brand">Mi Sitio</div>
      <ul className="nav-menu">
        {pages.map((page) => (
          <li key={page}>
            <button
              className={currentPage === page ? 'nav-link active' : 'nav-link'}
              onClick={() => onNavigate(page)}
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

