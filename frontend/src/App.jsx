import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, ArrowDownCircle, ArrowUpCircle, 
  Users, LogIn, LogOut, Plus, Trash2, RefreshCw, CheckCircle, AlertTriangle, FileText, Activity, Box 
} from 'lucide-react';
import { Product3DViewer } from './Product3DViewer';

// Resolución de la URL de la API según el entorno:
// 1. Si está configurada la variable VITE_API_URL (ej. en Coolify: https://api.diplomado.cerice360.com o similar)
// 2. Si estamos en diplomado.cerice360.com y Coolify sirve en el mismo host o subdominio api
// 3. Si estamos en cherry.lat
// 4. Si estamos en Docker local puerto 3000 -> puerto 8000
// 5. Desarrollo local por defecto -> puerto 8000 o 8001
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (window.location.hostname.includes("diplomado.cerice360.com")
      ? `${window.location.protocol}//api.${window.location.hostname}/api/v1`
      : (window.location.hostname.includes("cherry.lat")
          ? "https://ensiladosapi.cherry.lat/api/v1"
          : (window.location.port === "8000" || window.location.port === "3000"
              ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
              : "http://127.0.0.1:8000/api/v1")));

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(localStorage.getItem('username') || '');
  const [tab, setTab] = useState('inventory'); // inventory, 3dview, pos, purchases, kardex, suppliers, auth
  const [selectedProduct3D, setSelectedProduct3D] = useState(null);

  // Data states
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [purchasesHistory, setPurchasesHistory] = useState([]);
  const [kardexHistory, setKardexHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Auth form
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '123' });

  // New product form (Silo de Maíz / Sorgo)
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    price: '',
    cost_price: '',
    stock: '',
    min_stock: '5'
  });

  // POS / Ventas Cart
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // Purchase Form
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseProductId, setPurchaseProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseCost, setPurchaseCost] = useState('');

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    nombre_razon_social: '',
    nit_ci: '',
    telefono: ''
  });

  const notify = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión');

      setToken(data.access_token);
      setUser(data.username);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', data.username);
      notify(`Bienvenido, ${data.username}! Sesión iniciada con éxito.`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    notify('Sesión cerrada correctamente');
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resProd, resSupp, resSales, resPurch, resKardex] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/suppliers`),
        fetch(`${API_BASE}/sales`),
        fetch(`${API_BASE}/purchases`),
        fetch(`${API_BASE}/kardex`)
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resSupp.ok) setSuppliers(await resSupp.json());
      if (resSales.ok) setSalesHistory(await resSales.json());
      if (resPurch.ok) setPurchasesHistory(await resPurch.json());
      if (resKardex.ok) setKardexHistory(await resKardex.json());
    } catch (err) {
      notify('Error al conectar con la API: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Crear Producto (Silo / Forraje)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: productForm.sku,
          name: productForm.name,
          price: parseFloat(productForm.price),
          cost_price: parseFloat(productForm.cost_price || 0),
          stock: parseInt(productForm.stock || 0),
          min_stock: parseInt(productForm.min_stock || 0)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al crear producto');

      notify(`Producto ${data.name} registrado con éxito en Supabase y Kardex inicial creado.`);
      setProductForm({ sku: '', name: '', price: '', cost_price: '', stock: '', min_stock: '5' });
      loadAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Eliminar Producto
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`¿Eliminar ${name} del inventario?`)) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar el producto');
      notify(`Producto eliminado`);
      loadAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Carrito de Ventas (Checkout de Silo a Ganaderos)
  const addToCart = () => {
    const prod = products.find(p => p.id === parseInt(selectedProductId));
    if (!prod) return notify('Selecciona un producto válido', 'error');
    if (selectedQty <= 0) return notify('La cantidad debe ser mayor a 0', 'error');
    if (selectedQty > prod.stock) return notify(`Stock insuficiente. Solo hay ${prod.stock} disponibles en silo`, 'error');

    const existingIndex = cart.findIndex(item => item.product_id === prod.id);
    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + selectedQty;
      if (newQty > prod.stock) return notify(`No puedes superar el stock disponible (${prod.stock})`, 'error');
      const updated = [...cart];
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    } else {
      setCart([...cart, { product_id: prod.id, name: prod.name, unit_price: prod.price, quantity: selectedQty }]);
    }
    notify(`Agregado a la orden: ${prod.name}`);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const checkoutSale = async () => {
    if (cart.length === 0) return notify('La orden está vacía', 'error');
    try {
      const payload = {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      };
      const res = await fetch(`${API_BASE}/sales/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en la venta');

      notify(`¡Venta #${data.id} procesada exitosamente! Stock descontado y auditado en Kardex.`);
      setCart([]);
      loadAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Registrar Compra (Entrada de Cosecha / Silos de Maíz o Sorgo)
  const handleRegisterPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseProductId) return notify('Selecciona un producto', 'error');
    try {
      const payload = {
        supplier_id: purchaseSupplierId ? parseInt(purchaseSupplierId) : null,
        items: [{
          product_id: parseInt(purchaseProductId),
          quantity: parseInt(purchaseQty),
          unit_cost: parseFloat(purchaseCost)
        }]
      };
      const res = await fetch(`${API_BASE}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error en la compra');

      notify(`¡Entrada de grano/ensilado #${data.id} registrada! Stock aumentado y trazado en Kardex.`);
      setPurchaseQty(1);
      setPurchaseCost('');
      loadAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Crear Proveedor / Productor
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar proveedor');

      notify(`Proveedor ${data.nombre_razon_social} registrado.`);
      setSupplierForm({ nombre_razon_social: '', nit_ci: '', telefono: '' });
      loadAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Corporativo Ensilados Santa Cruz */}
      <header style={{
        background: '#14532d',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package size={26} color="#86efac" />
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>
              Ensilados Santa Cruz
            </h1>
            <span style={{ fontSize: '12px', color: '#bbf7d0' }}>
              Gestión de Silos (Maíz/Sorgo), Inventario Estricto & Kardex
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', background: '#166534', padding: '4px 10px', borderRadius: '4px' }}>
                👤 {user} (Admin)
              </span>
              <button 
                onClick={handleLogout}
                style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LogOut size={14} /> Salir
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: '#dcfce7' }}>
              API: <code>{API_BASE}</code>
            </span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '24px 16px', flex: 1 }}>
        {/* Feedback Alert */}
        {feedback.text && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: feedback.type === 'error' ? '#991b1b' : '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500
          }}>
            {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {feedback.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #cbd5e1', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('inventory')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'inventory' ? '#15803d' : '#e2e8f0',
              color: tab === 'inventory' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <Package size={16} /> 1. Silos & Existencias ({products.length})
          </button>
          <button
            onClick={() => setTab('3dview')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === '3dview' ? '#15803d' : '#e2e8f0',
              color: tab === '3dview' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <Box size={16} /> Visor 3D Interactivo
          </button>
          <button
            onClick={() => setTab('pos')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'pos' ? '#15803d' : '#e2e8f0',
              color: tab === 'pos' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <ShoppingCart size={16} /> 2. Venta a Ganaderos (Salidas)
          </button>
          <button
            onClick={() => setTab('purchases')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'purchases' ? '#15803d' : '#e2e8f0',
              color: tab === 'purchases' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <ArrowDownCircle size={16} /> 3. Recepción de Ensilado (Compras)
          </button>
          <button
            onClick={() => setTab('kardex')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'kardex' ? '#15803d' : '#e2e8f0',
              color: tab === 'kardex' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <Activity size={16} /> 4. Kardex de Auditoría ({kardexHistory.length})
          </button>
          <button
            onClick={() => setTab('suppliers')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'suppliers' ? '#15803d' : '#e2e8f0',
              color: tab === 'suppliers' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <Users size={16} /> 5. Productores / Clientes ({suppliers.length})
          </button>
          <button
            onClick={() => setTab('auth')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: tab === 'auth' ? '#15803d' : '#e2e8f0',
              color: tab === 'auth' ? '#fff' : '#334155',
              borderRadius: '6px 6px 0 0',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <LogIn size={16} /> Login JWT
          </button>
        </div>

        {/* TAB VISOR 3D */}
        {tab === '3dview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <div>
              <Product3DViewer
                productName={selectedProduct3D?.name || (products.length > 0 ? products[0].name : "Silo de Grano / Maíz")}
                category={selectedProduct3D?.categoria || "Almacenamiento Agrícola"}
                sku={selectedProduct3D?.sku || (products.length > 0 ? products[0].sku : "SILO-01")}
                stock={selectedProduct3D?.stock ?? (products.length > 0 ? products[0].stock : 10)}
              />
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>
                Seleccionar Producto para Visualizar en 3D
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                Explora la estructura 3D interactiva, rota con el ratón o el dedo y ajusta el zoom.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct3D(p)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: selectedProduct3D?.id === p.id ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: selectedProduct3D?.id === p.id ? '#f0fdf4' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      SKU: <code>{p.sku}</code> | Stock: <strong>{p.stock}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: INVENTARIO */}
        {tab === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Catálogo de Ensilados y Existencias</h2>
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>SKU</th>
                      <th>Tipo de Ensilado</th>
                      <th>Costo Unit.</th>
                      <th>Precio Venta</th>
                      <th>Stock (Tn/Bolsas)</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                          No hay productos registrados en Supabase. Agrega el primero en el panel lateral.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const isLow = p.stock <= p.min_stock;
                        return (
                          <tr key={p.id}>
                            <td>#{p.id}</td>
                            <td><code>{p.sku}</code></td>
                            <td><strong>{p.name}</strong></td>
                            <td>${p.cost_price.toFixed(2)}</td>
                            <td><strong>${p.price.toFixed(2)}</strong></td>
                            <td>
                              <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{p.stock}</span>
                            </td>
                            <td>
                              {p.stock === 0 ? (
                                <span className="badge badge-danger">Agotado</span>
                              ) : isLow ? (
                                <span className="badge badge-warning">Bajo stock</span>
                              ) : (
                                <span className="badge badge-success">Disponible</span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formulario Nuevo Producto */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#15803d" /> Nuevo Tipo de Ensilado
              </h3>
              <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Código SKU</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="Ej. SILO-MAIZ-TN"
                    value={productForm.sku}
                    onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Descripción del Ensilado</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="Ej. Ensilado de Maíz Calidad Extra (Tn)"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>P. Costo</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={{ width: '100%', marginTop: '4px' }}
                      placeholder="45.00"
                      value={productForm.cost_price}
                      onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>P. Venta *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      style={{ width: '100%', marginTop: '4px' }}
                      placeholder="75.00"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>Stock Inicial</label>
                    <input
                      type="number"
                      min="0"
                      style={{ width: '100%', marginTop: '4px' }}
                      placeholder="20"
                      value={productForm.stock}
                      onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500' }}>Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      style={{ width: '100%', marginTop: '4px' }}
                      placeholder="5"
                      value={productForm.min_stock}
                      onChange={e => setProductForm({ ...productForm, min_stock: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    marginTop: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  Registrar en Supabase
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: VENTAS (CHECKOUT) */}
        {tab === 'pos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            <div>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                  🌾 Salida / Despacho a Ganaderos
                </h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    style={{ flex: 1 }}
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Silo o Forraje --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} (Stock: {p.stock} | Precio: ${p.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    style={{ width: '90px' }}
                    value={selectedQty}
                    onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                  />
                  <button
                    onClick={addToCart}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
                Ventas Procesadas Recientes
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Venta ID</th>
                      <th>Fecha</th>
                      <th>Total Facturado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                          No hay ventas registradas aún.
                        </td>
                      </tr>
                    ) : (
                      salesHistory.map(s => (
                        <tr key={s.id}>
                          <td><strong>#{s.id}</strong></td>
                          <td>{new Date(s.created_at).toLocaleString()}</td>
                          <td><strong style={{ color: '#15803d' }}>${s.total_amount.toFixed(2)}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orden de Venta */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                Detalle del Despacho
              </h3>
              {cart.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '20px 0' }}>
                  No hay productos en la orden.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {item.quantity} x ${item.unit_price.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>${(item.unit_price * item.quantity).toFixed(2)}</span>
                        <button
                          onClick={() => removeFromCart(idx)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '2px 6px', borderRadius: '4px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Total a Cobrar:</span>
                    <span style={{ color: '#15803d' }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={checkoutSale}
                    style={{
                      background: '#15803d',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      marginTop: '12px'
                    }}
                  >
                    Confirmar Salida y Descontar Silo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COMPRAS / RECEPCIÓN */}
        {tab === 'purchases' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
                Entradas de Silos y Cosechas (Compras)
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Compra ID</th>
                      <th>Fecha</th>
                      <th>Productor / Proveedor</th>
                      <th>Total Comprado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchasesHistory.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                          No hay recepciones de silo registradas.
                        </td>
                      </tr>
                    ) : (
                      purchasesHistory.map(p => {
                        const supp = suppliers.find(s => s.id === p.supplier_id);
                        return (
                          <tr key={p.id}>
                            <td><strong>#{p.id}</strong></td>
                            <td>{new Date(p.created_at).toLocaleString()}</td>
                            <td>{supp ? supp.nombre_razon_social : 'Sin proveedor'}</td>
                            <td><strong>${p.total_amount.toFixed(2)}</strong></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownCircle size={18} color="#15803d" /> Recepción de Mercadería
              </h3>
              <form onSubmit={handleRegisterPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Productor / Proveedor</label>
                  <select
                    style={{ width: '100%', marginTop: '4px' }}
                    value={purchaseSupplierId}
                    onChange={e => setPurchaseSupplierId(e.target.value)}
                  >
                    <option value="">-- Productor Local / General --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre_razon_social} ({s.nit_ci})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Tipo de Ensilado *</label>
                  <select
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    value={purchaseProductId}
                    onChange={e => {
                      setPurchaseProductId(e.target.value);
                      const prod = products.find(p => p.id === parseInt(e.target.value));
                      if (prod && !purchaseCost) setPurchaseCost(prod.cost_price || '');
                    }}
                  >
                    <option value="">-- Seleccionar Silo --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock actual: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Cantidad a Ingresar *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    value={purchaseQty}
                    onChange={e => setPurchaseQty(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Costo Unitario ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="45.00"
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    marginTop: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  Registrar Entrada y Sumar al Silo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: KARDEX DE AUDITORÍA */}
        {tab === 'kardex' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Trazabilidad & Kardex de Auditoría</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Registro cronológico de movimientos de entrada, salida y saldo de existencias en Supabase.
                </p>
              </div>
              <button
                onClick={loadAllData}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px'
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar Kardex
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID Mov.</th>
                    <th>Fecha y Hora</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock Anterior</th>
                    <th>Stock Nuevo</th>
                    <th>Referencia</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {kardexHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                        No hay movimientos registrados en el Kardex.
                      </td>
                    </tr>
                  ) : (
                    kardexHistory.map(k => {
                      const prod = products.find(p => p.id === k.product_id);
                      const isEntry = k.tipo_movimiento === 'ENTRADA';
                      return (
                        <tr key={k.id}>
                          <td><strong>#{k.id}</strong></td>
                          <td>{new Date(k.created_at).toLocaleString()}</td>
                          <td><strong>{prod ? prod.name : `ID: ${k.product_id}`}</strong></td>
                          <td>
                            <span className={`badge ${isEntry ? 'badge-success' : 'badge-danger'}`}>
                              {k.tipo_movimiento}
                            </span>
                          </td>
                          <td><strong>{isEntry ? `+${k.cantidad}` : `-${k.cantidad}`}</strong></td>
                          <td>{k.stock_anterior}</td>
                          <td><strong style={{ color: '#0f172a' }}>{k.stock_nuevo}</strong></td>
                          <td><code>{k.referencia || 'N/A'}</code></td>
                          <td>{k.motivo || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PROVEEDORES / PRODUCTORES */}
        {tab === 'suppliers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
                Directorio de Productores, Proveedores y Ganaderos
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre / Razón Social</th>
                      <th>NIT / CI</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                          No hay contactos registrados.
                        </td>
                      </tr>
                    ) : (
                      suppliers.map(s => (
                        <tr key={s.id}>
                          <td>#{s.id}</td>
                          <td><strong>{s.nombre_razon_social}</strong></td>
                          <td><code>{s.nit_ci}</code></td>
                          <td>{s.telefono || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#15803d" /> Nuevo Productor / Contacto
              </h3>
              <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Nombre o Razón Social *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="Ej. Asociación Ganadera del Norte"
                    value={supplierForm.nombre_razon_social}
                    onChange={e => setSupplierForm({ ...supplierForm, nombre_razon_social: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>NIT / CI *</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="Ej. 748392019"
                    value={supplierForm.nit_ci}
                    onChange={e => setSupplierForm({ ...supplierForm, nit_ci: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500' }}>Teléfono</label>
                  <input
                    type="text"
                    style={{ width: '100%', marginTop: '4px' }}
                    placeholder="+591 70000000"
                    value={supplierForm.telefono}
                    onChange={e => setSupplierForm({ ...supplierForm, telefono: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    marginTop: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  Guardar Contacto
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: LOGIN JWT */}
        {tab === 'auth' && (
          <div style={{ maxWidth: '420px', margin: '30px auto', background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Inicio de Sesión JWT</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Autenticación segura para operadores y administradores de Ensilados Santa Cruz.
            </p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Usuario</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px' }}
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Contraseña</label>
                <input
                  type="password"
                  required
                  style={{ width: '100%', marginTop: '4px' }}
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: '#15803d',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  fontWeight: 'bold',
                  marginTop: '8px'
                }}
              >
                Autenticarse
              </button>
            </form>
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
              Credenciales: <strong>admin</strong> / <strong>123456</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
