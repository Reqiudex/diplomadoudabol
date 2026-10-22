# 📦 Sistema de Compra-Venta, Inventario Estricto y Kardex de Auditoría

> **Proyecto Académico — Diplomado UDABOL 2026**  
> Desarrollado con **FastAPI**, **PostgreSQL (Supabase)**, **React 19 (Vite + Tailwind CSS)** y orquestado con **Docker / Coolify / Cloudflare Zero Trust**.

---

## 🌐 Enlaces Públicos de Producción en Vivo (Revisión Docente)

El sistema se encuentra 100% operativo y desplegado en servidores de producción con certificados SSL/TLS activos:

| Componente | Enlace Público en Vivo | Descripción / Acceso |
|---|---|---|
| **🛒 Aplicación Web (Frontend)** | [https://diplomado.cerice360.com](https://diplomado.cerice360.com) | Interfaz React SPA, visor 3D interactivo, POS y gestión |
| **⚡ Backend API (Swagger UI)** | [https://apidiplomado.cerice360.com/docs](https://apidiplomado.cerice360.com/docs) | Documentación interactiva OpenAPI / Swagger |
| **📖 Backend API (Redoc)** | [https://apidiplomado.cerice360.com/redoc](https://apidiplomado.cerice360.com/redoc) | Especificación técnica OpenAPI en formato Redoc |
| **🩺 Healthcheck API** | [https://apidiplomado.cerice360.com/health](https://apidiplomado.cerice360.com/health) | Estado del servicio y timestamp UTC en tiempo real |
| **🗄️ Base de Datos Web (pgAdmin 4)** | [https://diplomadodb.cerice360.com](https://diplomadodb.cerice360.com) | Administrador visual de tablas, relaciones y Kardex |

### 🔑 Credenciales de Acceso para Evaluación

#### 1. Acceso a la Aplicación Web (Frontend)
- **Usuario:** `admin`
- **Contraseña:** `123456` *(o `123`)*
- **Rol:** `ADMIN` (Generación de JWT y acceso a todos los módulos)

#### 2. Acceso a pgAdmin 4 (Administrador de Base de Datos)
- **URL:** [https://diplomadodb.cerice360.com](https://diplomadodb.cerice360.com)
- **Email de ingreso:** `admin@cerice360.com`
- **Contraseña de ingreso:** `tCRrf20gexaPSXocxZvI`
- **Conexión al servidor PostgreSQL:**
  - **Host:** `supabase-db-bx4ixq11kl7vwnrall5bdty0` *(o IP del host)*
  - **Puerto:** `5432`
  - **Base de datos:** `diplomado_udabol`
  - **Usuario BD:** `diplomado_user`
  - **Contraseña BD:** `MwUe1yEKY1OVdoN0JHbaJpD2`

---

## 🏛️ Arquitectura del Sistema en Producción

```
                                  [ INTERNET / CLIENTES ]
                                             │
                                             ▼
                        [ Cloudflare Edge SSL / Tunnel Ingress ]
                                             │
       ┌─────────────────────────────────────┼─────────────────────────────────────┐
       │ (diplomado.cerice360.com)           │ (apidiplomado.cerice360.com)        │ (diplomadodb.cerice360.com)
       ▼                                     ▼                                     ▼
┌──────────────┐                      ┌──────────────┐                      ┌──────────────┐
│   Frontend   │                      │   Backend    │                      │   pgAdmin    │
│ React + Vite │   Proxy / API REST   │   FastAPI    │                      │  PostgreSQL  │
│ Puerto: 8088 │ ◄──────────────────► │ Puerto: 8089 │                      │ Puerto: 8090 │
└──────────────┘                      └──────┬───────┘                      └──────┬───────┘
                                             │                                     │
                                             ├─────────────────────────────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │     PostgreSQL / Supabase   │
                              │     Base: diplomado_udabol  │
                              │     9 Tablas + Kardex Lock  │
                              └──────────────┬──────────────┘
                                             │ Webhook Eventos
                                             ▼
                              ┌─────────────────────────────┐
                              │  Slack Workspace Cerice360  │
                              │  Alertas de Stock y Ventas  │
                              └─────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico Implementado

| Capa | Tecnología | Implementación en Producción |
|---|---|---|
| **Frontend** | React 19, Vite 5, Tailwind CSS, Three.js | SPA moderna con Three.js / `@react-three/fiber` para renderizado 3D de productos y utilidades de normalización Decimal |
| **Backend** | Python 3.12, FastAPI 0.145, Uvicorn | API REST modular, validación estricta con Pydantic v2 y autenticación JWT (PyJWT) |
| **ORM & Migraciones** | SQLAlchemy 2.1, Alembic 1.20 | Transacciones atómicas con bloqueos `with_for_update()`, auditoría en Kardex y control de versiones |
| **Base de Datos** | PostgreSQL 15 (Supabase) | 9 tablas normalizadas, restricciones de integridad referencial y stock no negativo |
| **Mensajería / Alertas** | Slack Incoming Webhook + Slack CLI v4.10 | Notificaciones en tiempo real al registrar productos, entradas y ventas |
| **Infraestructura** | Docker Compose, Coolify, Nginx Alpine, Cloudflare Tunnel | Despliegue contenerizado en red bridge interna con túnel seguro HTTPS sin exponer puertos abiertos |

---

## 🗄️ Modelo de Datos Relacional (9 Tablas)

1. **`users`**: Identificador, nombre, correo electrónico único, password_hash (`bcrypt`), rol (`ADMIN`, `SELLER`, `WAREHOUSE_MANAGER`), estado y marcas temporales.
2. **`products`**: ID, SKU único, nombre, descripción, categoría, precio de costo (`Numeric(12,2)`), precio de venta (`Numeric(12,2)`), stock actual, stock mínimo y estado.
3. **`suppliers`**: ID, nombre / razón social, NIT/CI único, teléfono, email, dirección y estado.
4. **`customers`**: ID, nombre completo, documento/NIT único, teléfono, email, dirección y estado.
5. **`purchases`**: ID, proveedor (`FK`), usuario responsable (`FK`), subtotal, total (`Numeric`), estado y observaciones.
6. **`purchase_items`**: ID, compra (`FK`), producto (`FK`), cantidad, costo unitario (`Numeric`) y subtotal.
7. **`sales`**: ID, cliente (`FK`), usuario responsable (`FK`), subtotal, descuento, total (`Numeric`), método de pago (`EFECTIVO`, `QR`, `TARJETA`) y estado.
8. **`sale_items`**: ID, venta (`FK`), producto (`FK`), cantidad, precio unitario aplicado (`Numeric`) y subtotal.
9. **`kardex_movements`**: ID, producto (`FK`), usuario (`FK`), tipo de movimiento (`ENTRADA`, `SALIDA`, `AJUSTE`), cantidad, stock anterior, stock resultante, costo unitario, referencia de orden y motivo de auditoría.

---

## 🔔 Notificaciones en Tiempo Real (Slack)

El sistema cuenta con un conector nativo en [`backend/slack_notifier.py`](backend/slack_notifier.py) que despacha bloques interactivos a Slack ante:
- Creación de nuevos productos en el catálogo.
- Ingreso de stock por compras o inventario inicial.
- Ventas y alertas de stock bajo.

---

## 🎨 Visualizador 3D Interactivo de Productos (Three.js)

Se implementó un motor de renderizado 3D en [`frontend/src/Product3DViewer.tsx`](frontend/src/Product3DViewer.tsx) con modelos especializados e interactivos para cada producto:
- **Martillo de Uña 16oz:** Cabeza de acero forjado cromado, uña sacaclavos y mango ergonómico con grip negro.
- **Taladro Percutor Bosch 750W:** Carcasa azul industrial, mandril dentado, broca plateada y selector de percusión.
- **Amoladora DeWalt 4-1/2":** Chasis amarillo DeWalt, disco abrasivo, guarda protectora y manija lateral.
- **Bolsa Ensilado SiloPack 50kg:** Bolsa orgánica en polietileno tricapa blanco UV con franja verde y precinto.
- **Inoculante Bacteriano 100g:** Frasco de agroquímicos con precinto inviolable y medidor de graduación.
- **Juego de Llaves Stanley:** Estuche organizador rígido y set de 5 llaves métricas cromadas (boca fija y estriada).
- **Silo Agrícola Industrial:** Silo cilíndrico de chapa galvanizada con techo cónico y patas soporte.
- **Características:** Detección automática al seleccionar productos, iluminación multicapa (Key/Rim/Fill), rotación 360° táctil/ratón, zoom interactivo y botón de acceso rápido `[ 3D ]` directo en cada fila de inventario.

---

## 🧪 Pruebas Automatizadas del Backend

Se dispone de una suite completa de pruebas unitarias y de integración con **pytest**:

```bash
cd backend
python -m pytest -v tests/test_api.py tests/test_slack.py
```

### Casos de prueba cubiertos:
- ✅ **Healthcheck:** Verificación de endpoint `/health` (HTTP 200).
- ✅ **Autenticación:** Emisión y validación de tokens Bearer JWT y rechazo de credenciales incorrectas.
- ✅ **Catálogo & Normalización:** Creación de productos con SKU único y persistencia numérica.
- ✅ **Validación Estricta de Stock:** Rechazo inmediato con HTTP 400 al intentar vender sin existencia disponible.
- ✅ **Transacciones de Compra:** Incremento consistente de stock y registro en Kardex (`ENTRADA`).
- ✅ **Transacciones de Venta:** Descuento atómico de stock y registro en Kardex (`SALIDA`).
- ✅ **Notificador Slack:** Despacho con webhook y manejo silencioso de excepciones en caso de fallo de red.

---

## 💻 Ejecución Local con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/Reqiudex/diplomadoudabol.git
cd diplomadoudabol

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Construir y levantar
docker compose up --build
```

- **Frontend:** `http://localhost:3000` (o `http://localhost:8088` en producción)
- **Backend API:** `http://localhost:8000` (o `http://localhost:8089` en producción)
- **Documentación Swagger:** `http://localhost:8000/docs`
