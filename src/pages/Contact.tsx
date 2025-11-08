import { useState } from "react";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Gracias ${formData.name}! Tu mensaje ha sido enviado.`);
    setFormData({ name: "", email: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="page">
      <h1>Contacto</h1>
      <p className="description">
        Estamos aquí para ayudarte. Envíanos un mensaje
      </p>
      <div className="contact-container">
        <div className="contact-info">
          <h2>Información de Contacto</h2>
          <div className="info-item">
            <span className="info-icon" aria-hidden="true">📍</span>
            <div>
              <h3>Dirección</h3>
              <p>Calle Principal 123, Ciudad</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon" aria-hidden="true">📧</span>
            <div>
              <h3>Email</h3>
              <p>
                <a href="mailto:contacto@misitio.com" aria-label="Enviar email a contacto@misitio.com">
                  contacto@misitio.com
                </a>
              </p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon" aria-hidden="true">📱</span>
            <div>
              <h3>Teléfono</h3>
              <p>
                <a href="tel:+34123456789" aria-label="Llamar al número +34 123 456 789">
                  +34 123 456 789
                </a>
              </p>
            </div>
          </div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit} aria-label="Formulario de contacto">
          <h2>Envíanos un Mensaje</h2>
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Mensaje</label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Enviar Mensaje
          </button>
        </form>
      </div>
    </div>
  );
}

export default Contact;
