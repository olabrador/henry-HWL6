function Services() {
  const services = [
    {
      title: "Consultoría",
      icon: "💼",
      description: "Asesoramiento profesional para tu negocio",
      features: [
        "Análisis de mercado",
        "Estrategias personalizadas",
        "Soporte continuo",
      ],
    },
    {
      title: "Desarrollo",
      icon: "💻",
      description: "Soluciones tecnológicas a medida",
      features: ["Aplicaciones web", "Apps móviles", "Sistemas empresariales"],
    },
    {
      title: "Diseño",
      icon: "🎨",
      description: "Diseño creativo y profesional",
      features: ["Branding", "UI/UX Design", "Marketing visual"],
    },
  ];

  return (
    <div className="page">
      <h1>Servicios</h1>
      <p className="description">
        Ofrecemos soluciones completas para hacer crecer tu negocio
      </p>
      <div className="services-grid" role="list">
        {services.map((service, index) => (
          <div key={index} className="service-card" role="listitem">
            <div className="service-icon" aria-hidden="true">{service.icon}</div>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
            <ul className="service-features" role="list">
              {service.features.map((feature, idx) => (
                <li key={idx} role="listitem">
                  <span aria-hidden="true">✓</span> {feature}
                </li>
              ))}
            </ul>
            <button 
              className="btn-secondary"
              aria-label={`Más información sobre ${service.title}`}
            >
              Más información
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Services;
