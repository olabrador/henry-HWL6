function Products() {
  const products = [
    {
      id: 1,
      name: "Producto A",
      price: "$29.99",
      description: "Excelente calidad",
    },
    { id: 2, name: "Producto B", price: "$49.99", description: "Muy popular" },
    { id: 3, name: "Producto C", price: "$19.99", description: "Mejor precio" },
    {
      id: 4,
      name: "Producto D",
      price: "$39.99",
      description: "Edición especial",
    },
  ];

  return (
    <div className="page">
      <h1>Nuestros Productos</h1>
      <p className="description">
        Descubre nuestra selección de productos de alta calidad
      </p>
      <div className="products-grid" role="list">
        {products.map((product) => (
          <div key={product.id} className="product-card" role="listitem">
            <div className="product-icon" aria-hidden="true">📦</div>
            <h3>{product.name}</h3>
            <p className="product-description">{product.description}</p>
            <p className="product-price" aria-label={`Precio: ${product.price}`}>{product.price}</p>
            <button 
              className="btn-primary"
              aria-label={`Comprar ${product.name} por ${product.price}`}
            >
              Comprar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
