# 📦 Sistema de Compra-Venta, Inventario Estricto y Kardex de Auditoría

> **Proyecto Académico — Diplomado UDABOL 2026**  
> Desarrollado con **FastAPI**, **Supabase PostgreSQL**, **React (Vite + Tailwind CSS)** y orquestación con **Docker / Coolify**.  
> **Dominio de Producción en Servidor:** `https://diplomado.cerice360.com`  
> **API & Swagger Docs:** `https://api.diplomado.cerice360.com`

---

## 🏛️ Arquitectura del Sistema

```
                      ┌────────────────────────────────────────┐
                      │        diplomado.cerice360.com         │
                      └───────────────────┬────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
      ┌────────────▼──────────┐                     ┌────────────▼──────────┐
      │   Frontend Web SPA    │                     │   Backend REST API    │
      │  React 19 + Vite 5    │  HTTP / JSON        │  FastAPI + SQLAlchemy │
      │  Nginx Alpine         │ ◄─────────────────► │  Puerto 8000          │
      │  Puerto 80 / 3000     │                     │  Pydantic + JWT       │
      └───────────────────────┘                     └────────────┬──────────┘
                                                                 │
                                                    ┌────────────▼──────────┐
                                                    │  Supabase PostgreSQL  │
                                                    │  Cloud Managed ☁️      │
                                                    │  9 Tablas Normalizadas│
                                                    │  Kardex Transaccional │
                                                    └───────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Backend** | Python 3.12 + FastAPI 0.145 | API REST asíncrona de alto rendimiento |
| **ORM / Migraciones** | SQLAlchemy 2.1 + Alembic 1.20 | Modelado relacional, transacciones con bloqueos y versionado |
| **Validación de Datos** | Pydantic 2.14 | Tipado estricto, esquemas de entrada y salida |
| **Base de Datos** | Supabase (PostgreSQL 15) | Base de datos gestionada en la nube con modo Pooler |
| **Seguridad** | PyJWT + Bcrypt | Hash seguro de contraseñas y tokens Bearer JWT |
| **Frontend** | React 19 + Vite 5 + Tailwind CSS | Interfaz moderna, reactiva y responsive |
| **Contenedores** | Docker + Docker Compose + Nginx | Despliegue reproducible en Coolify / Ubuntu Server |

---

## 🗄️ Modelo de Datos (9 Tablas Implementadas)

1. **`users`**: Identificador, nombre, correo electrónico único, password_hash (bcrypt), rol (`ADMIN`, `SELLER`, `WAREHOUSE_MANAGER`), estado, timestamps.
2. **`products`**: ID, SKU único, nombre, descripción, categoría, precio de compra (`Numeric`), precio de venta (`Numeric`), stock actual, stock mínimo, estado, timestamps.
3. **`suppliers`**: ID, nombre, nombre/razón social, NIT/CI único, teléfono, email, dirección, estado, timestamps.
4. **`customers`**: ID, nombre, documento/NIT único, teléfono, email, dirección, estado, timestamps.
5. **`purchases`**: ID, proveedor (`FK`), usuario responsable (`FK`), subtotal, total (`Numeric`), estado, observaciones, timestamps.
6. **`purchase_items`**: ID, compra (`FK`), producto (`FK`), cantidad, costo unitario (`Numeric`), subtotal (`Numeric`).
7. **`sales`**: ID, cliente (`FK`), usuario responsable (`FK`), subtotal, descuento, total (`Numeric`), método de pago (`EFECTIVO`, `QR`, `TARJETA`), estado, observaciones, timestamps.
8. **`sale_items`**: ID, venta (`FK`), producto (`FK`), cantidad, precio unitario aplicado (`Numeric`), subtotal (`Numeric`).
9. **`kardex_movements`**: ID, producto (`FK`), usuario (`FK`), tipo de movimiento (`ENTRADA`, `SALIDA`, `AJUSTE`), cantidad, stock anterior, stock resultante, costo unitario, referencia de orden, motivo, timestamps.

---

## 🚀 Despliegue en Servidor con Coolify

Para instrucciones detalladas paso a paso con capturas y opciones de configuración, consulta el archivo:  
👉 **[DEPLOY_COOLIFY.md](DEPLOY_COOLIFY.md)**

### Pasos rápidos en Coolify:
1. Conecta el repositorio de GitHub: `https://github.com/Reqiudex/diplomadoudabol` (rama `main`).
2. Configura las variables secretas en la interfaz de Coolify (guíate con `.env.example`):
   - `DATABASE_URL`: Cadena de conexión de Supabase Pooler IPv4.
   - `JWT_SECRET_KEY`: Tu clave secreta generada.
   - `CORS_ORIGINS`: `https://diplomado.cerice360.com`
   - `VITE_API_URL`: `https://api.diplomado.cerice360.com/api/v1`
3. Asigna los dominios en Coolify:
   - Frontend: `https://diplomado.cerice360.com`
   - Backend: `https://api.diplomado.cerice360.com`
4. Pulsa **Deploy**.

---

## 💻 Ejecución Local con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/Reqiudex/diplomadoudabol.git
cd diplomadoudabol

# 2. Configurar variables de entorno
cp .env.example .env
# Completa tu DATABASE_URL en el archivo .env

# 3. Construir y levantar
docker compose up --build
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **Healthcheck:** `http://localhost:8000/health`

---

## 🧪 Pruebas Automatizadas

El backend cuenta con una suite completa de pruebas unitarias y de integración desarrolladas con **pytest**:

```bash
cd backend
python -m pytest -v tests/test_api.py
```

### Casos de prueba verificados:
- ✅ Endpoint de salud (`/health`) respondiendo 200 OK.
- ✅ Autenticación JWT con credenciales correctas e invalidación de erróneas.
- ✅ Creación y consulta de productos con SKU único.
- ✅ **Validación estricta de stock:** Rechazo con HTTP 400 y reversión atómica al intentar vender más de lo disponible.
- ✅ **Compras transaccionales:** Incremento de stock en base de datos y registro automático en Kardex (`ENTRADA`).
- ✅ **Ventas transaccionales:** Descuento de stock en base de datos y registro automático en Kardex (`SALIDA`).
