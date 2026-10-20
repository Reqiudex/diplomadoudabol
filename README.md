# 📦 Ensilados Santa Cruz — Manual de Usuario y Guía de Replicación

> Sistema web de **Compra, Venta, Inventario Estricto y Kardex de Auditoría** para silos de maíz, sorgo y forrajes ganaderos en Santa Cruz, Bolivia.  
> Desarrollado como proyecto de tesis con FastAPI + Supabase PostgreSQL + React/Vite + Cloudflare Tunnels.

---

## 📋 Tabla de Contenidos

1. [Descripción del Sistema](#-descripción-del-sistema)
2. [Arquitectura Técnica](#️-arquitectura-técnica)
3. [Requisitos Previos](#-requisitos-previos)
4. [Despliegue Rápido con Docker](#-despliegue-rápido-con-docker-recomendado)
5. [Instalación Manual Local](#-instalación-manual-local)
6. [Configuración de Supabase](#-configuración-de-supabase)
7. [Configuración de Cloudflare Tunnels](#-configuración-de-cloudflare-tunnels)
8. [Manual de Usuario del Sistema](#-manual-de-usuario-del-sistema)
9. [Referencia de Endpoints de la API](#-referencia-de-endpoints-de-la-api)
10. [Estructura del Repositorio](#-estructura-del-repositorio)
11. [Variables de Entorno](#-variables-de-entorno)

---

## 📖 Descripción del Sistema

**Ensilados Santa Cruz** es un sistema de gestión empresarial para operaciones de silo de granos (maíz y sorgo) orientado al mercado ganadero bovino y lechero.

### Funcionalidades Principales

| Módulo | Descripción |
|---|---|
| **Inventario de Silos** | Catálogo de productos con SKU, precios de compra/venta, stock actual y alertas de stock mínimo |
| **Ventas / Salidas** | Checkout transaccional que descuenta existencias atómicamente y valida stock disponible |
| **Compras / Entradas** | Recepción de mercadería que suma al inventario y actualiza costos de adquisición |
| **Kardex de Auditoría** | Trazabilidad completa e inmutable de cada movimiento (ENTRADA/SALIDA) |
| **Proveedores y Clientes** | Directorio de productores, asociaciones ganaderas y clientes con NIT/CI |
| **Autenticación JWT** | Acceso seguro con roles (admin, vendedor, almacenero) |

---

## 🏛️ Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────────┐
│                   ENSILADOS SANTA CRUZ                          │
├──────────────────┬──────────────────┬───────────────────────────┤
│   FRONTEND       │     BACKEND      │       BASE DE DATOS       │
│  React + Vite    │    FastAPI       │   Supabase (PostgreSQL)   │
│  Puerto 3000/80  │   Puerto 8000    │   Cloud Managed ☁️         │
│  Nginx (Docker)  │   SQLAlchemy     │   Pool Session Mode       │
└────────┬─────────┴────────┬─────────┴───────────────────────────┘
         │                  │
         └──────────────────┘
                 │
    ┌────────────┴────────────┐
    │   Cloudflare Tunnels    │
    │  ensilados.cherry.lat   │   (Frontend)
    │  ensiladosapi.cherry.lat│   (Backend API + /docs)
    └─────────────────────────┘
```

**Stack Tecnológico:**
- **Backend:** Python 3.12, FastAPI 0.145, SQLAlchemy 2.1, Uvicorn
- **Base de Datos:** Supabase (PostgreSQL 15 gestionado en la nube)
- **ORM:** SQLAlchemy + psycopg2-binary
- **Autenticación:** JWT con PyJWT 2.15
- **Frontend:** React 18, Vite 5, Lucide React (iconos)
- **Contenedores:** Docker, Docker Compose, Nginx (alpine)
- **Túneles SSL:** Cloudflare Tunnels (cloudflared)

---

## ✅ Requisitos Previos

### Para Docker (Despliegue Recomendado)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v24+ o Docker Engine 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+
- Cuenta gratuita en [Supabase](https://supabase.com) con proyecto creado

### Para Instalación Manual Local
- Python 3.11 o 3.12
- Node.js 20+ y npm 10+
- Git

---

## 🐳 Despliegue Rápido con Docker (Recomendado)

Esta es la forma más rápida de correr el sistema en cualquier máquina o servidor.

### Paso 1 — Clonar el Repositorio

```bash
git clone https://github.com/Ortlumon/diplomadoudabol.git
cd diplomadoudabol
```

### Paso 2 — Configurar Variables de Entorno

```bash
# Copiar la plantilla de variables
cp .env.example .env

# Editar con tus credenciales reales de Supabase
nano .env        # Linux/Mac
notepad .env     # Windows
```

Contenido del `.env`:
```env
DATABASE_URL=postgresql://postgres.TU_PROYECTO:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SECRET_KEY=una_clave_aleatoria_muy_larga_y_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

> **⚠️ IMPORTANTE:** Nunca subas el archivo `.env` real a GitHub. Ya está excluido en `.gitignore`.

### Paso 3 — Construir y Levantar con Docker Compose

```bash
docker compose up --build
```

El primer arranque tarda ~2 minutos mientras descarga las imágenes base y compila React.

### Paso 4 — Acceder al Sistema

| Servicio | URL |
|---|---|
| **Aplicación Web** | http://localhost:3000 |
| **API Backend** | http://localhost:8000 |
| **Swagger / Documentación** | http://localhost:8000/docs |
| **ReDoc** | http://localhost:8000/redoc |

### Comandos Docker Útiles

```bash
# Detener todos los contenedores
docker compose down

# Ver logs en tiempo real
docker compose logs -f

# Reconstruir solo el backend después de cambios
docker compose up --build backend

# Acceder a la consola del backend
docker compose exec backend bash
```

---

## 🛠️ Instalación Manual Local

### Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar (Windows)
.\venv\Scripts\Activate.ps1

# Activar (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear el archivo de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar servidor con recarga automática
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev -- --host 127.0.0.1 --port 5173

# Compilar para producción
npm run build
```

### Inicio con un Solo Clic (Windows)

Doble clic en `start_project.bat` en la raíz del proyecto.  
Esto levanta Backend, Frontend y el Túnel de Cloudflare en terminales separadas.

---

## ☁️ Configuración de Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo **Proyecto** y anota la contraseña de la base de datos.
3. Una vez creado, ve a: **Project Settings → Database → Connection string → URI**
4. Selecciona la pestaña **Transaction Pooler** o **Session Pooler** y copia la URI.
5. La URI tendrá este formato:
   ```
   postgresql://postgres.XXXXXX:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
6. Pega esta URI en tu archivo `.env` como `DATABASE_URL`.

> **Las tablas se crean automáticamente** al arrancar el backend por primera vez gracias a `models.Base.metadata.create_all(bind=engine)`.

**Tablas que se crean automáticamente:**

| Tabla | Descripción |
|---|---|
| `users` | Usuarios del sistema con roles |
| `products` | Catálogo de silos y forrajes |
| `suppliers` | Proveedores y clientes ganaderos |
| `purchases` + `purchase_items` | Entradas de mercadería |
| `sales` + `sale_items` | Salidas / ventas transaccionales |
| `kardex_movements` | Registro de auditoría inmutable |

---

## 🌐 Configuración de Cloudflare Tunnels

> Solo necesario si quieres exponer el sistema en internet con dominio propio y HTTPS automático.

### Prerrequisitos
- Dominio configurado en Cloudflare (ej: `cherry.lat`)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/) instalado

### Pasos

```bash
# 1. Autenticarse con Cloudflare
cloudflared tunnel login

# 2. Crear un nuevo túnel
cloudflared tunnel create ensilados

# 3. Anotar el ID del túnel generado (ej: aa6a7b0e-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# 4. Editar tunnel_config.yml con tu ID de túnel y rutas deseadas

# 5. Crear registros DNS (reemplaza el UUID con el tuyo)
cloudflared tunnel route dns TU_TUNNEL_ID ensilados.TU_DOMINIO.com
cloudflared tunnel route dns TU_TUNNEL_ID ensiladosapi.TU_DOMINIO.com

# 6. Arrancar el túnel
cloudflared tunnel --config tunnel_config.yml run TU_TUNNEL_ID
```

Edita `tunnel_config.yml` con tu UUID y dominios:
```yaml
tunnel: TU_TUNNEL_ID
credentials-file: C:\Users\TU_USUARIO\.cloudflared\TU_TUNNEL_ID.json

ingress:
  - hostname: ensiladosapi.TU_DOMINIO.com
    service: http://localhost:8001

  - hostname: ensilados.TU_DOMINIO.com
    service: http://localhost:5173

  - service: http_status:404
```

---

## 👤 Manual de Usuario del Sistema

### Ingreso al Sistema

1. Abre el navegador en `http://localhost:3000` (local) o en tu dominio de Cloudflare.
2. Haz clic en la pestaña **"Login JWT"** (extremo derecho de la barra de navegación).
3. Ingresa las credenciales:
   - **Usuario:** `admin`
   - **Contraseña:** `123456`
4. Haz clic en **"Autenticarse"**. Recibirás un mensaje de bienvenida verde.

---

### Módulo 1: Silos y Existencias (Inventario)

**Cómo registrar un nuevo producto:**

1. Ve a la pestaña **"1. Silos & Existencias"**.
2. En el panel derecho, completa el formulario:
   - **Código SKU:** Identificador único (ej: `SILO-MAIZ-TN`, `SILO-SORGO-BOLSON`)
   - **Descripción:** Nombre completo del producto
   - **P. Costo:** Precio de adquisición por unidad
   - **P. Venta:** Precio de venta al ganadero
   - **Stock Inicial:** Cantidad inicial disponible en silo
   - **Stock Mínimo:** Umbral de alerta (se marca en naranja cuando llega a este nivel)
3. Clic en **"Registrar en Supabase"**.

**Indicadores de stock:**
- 🟢 **Disponible:** Stock por encima del mínimo
- 🟡 **Bajo stock:** Stock igual o por debajo del mínimo configurado
- 🔴 **Agotado:** Sin existencias

---

### Módulo 2: Venta a Ganaderos (Salidas / Checkout)

**Cómo registrar una venta:**

1. Ve a la pestaña **"2. Venta a Ganaderos"**.
2. Selecciona el tipo de ensilado del menú desplegable.
3. Ingresa la cantidad a despachar.
4. Clic en **"+ Agregar"** para sumar al carrito.
5. Repite para agregar más productos si es una venta múltiple.
6. Revisa el **Detalle del Despacho** en el panel derecho con el total calculado.
7. Clic en **"Confirmar Salida y Descontar Silo"**.

> **🔒 Validación Estricta:** Si intentas vender más de lo disponible, el sistema rechazará la operación con el mensaje exacto: *"Stock insuficiente para 'X'. Solicitado: Y, Disponible: Z"*

---

### Módulo 3: Recepción de Ensilado (Compras / Entradas)

**Cómo registrar una entrada de mercadería:**

1. Ve a la pestaña **"3. Recepción de Ensilado"**.
2. Selecciona el Productor/Proveedor (opcional, puedes usar "Productor Local / General").
3. Selecciona el tipo de silo a ingresar.
4. Ingresa la **cantidad** recibida y el **costo unitario** de compra.
5. Clic en **"Registrar Entrada y Sumar al Silo"**.

El stock se actualiza automáticamente en tiempo real y el costo de adquisición se recalcula.

---

### Módulo 4: Kardex de Auditoría

**Consultar el historial de movimientos:**

1. Ve a la pestaña **"4. Kardex de Auditoría"**.
2. Verás todos los movimientos ordenados del más reciente al más antiguo.
3. Cada fila muestra:
   - **Tipo:** `ENTRADA` (verde) o `SALIDA` (rojo)
   - **Cantidad:** Prefijada con `+` para entradas y `-` para salidas
   - **Stock Anterior / Stock Nuevo:** Saldo antes y después del movimiento
   - **Referencia:** Enlace cruzado con Compra o Venta (ej: `Compra #3`, `Venta #5`)
   - **Fecha y Hora:** Timestamp en UTC

> El Kardex es **inmutable**: los registros no pueden editarse ni eliminarse desde la interfaz.

---

### Módulo 5: Proveedores y Clientes

**Registrar un nuevo contacto:**

1. Ve a la pestaña **"5. Productores / Clientes"**.
2. Completa el formulario lateral con Nombre/Razón Social, NIT/CI y Teléfono.
3. Clic en **"Guardar Contacto"**.

---

## 🔌 Referencia de Endpoints de la API

Accede a la documentación interactiva completa en: **`http://localhost:8000/docs`**

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Estado de la API |
| `POST` | `/api/v1/auth/login` | Autenticación y obtención de token JWT |
| `GET` | `/api/v1/products` | Listar todos los productos del inventario |
| `POST` | `/api/v1/products` | Crear nuevo producto |
| `PUT` | `/api/v1/products/{id}` | Actualizar datos de un producto |
| `DELETE` | `/api/v1/products/{id}` | Eliminar producto |
| `GET` | `/api/v1/suppliers` | Listar proveedores/clientes |
| `POST` | `/api/v1/suppliers` | Registrar proveedor/cliente |
| `GET` | `/api/v1/purchases` | Historial de compras |
| `POST` | `/api/v1/purchases` | Registrar compra (suma stock + Kardex) |
| `GET` | `/api/v1/sales` | Historial de ventas |
| `POST` | `/api/v1/sales/checkout` | Registrar venta (descuenta stock + Kardex) |
| `GET` | `/api/v1/kardex` | Consultar Kardex de auditoría |

**Ejemplo de Checkout de Venta:**
```bash
curl -X POST "http://localhost:8000/api/v1/sales/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 5},
      {"product_id": 2, "quantity": 2}
    ]
  }'
```

---

## 📁 Estructura del Repositorio

```
diplomadoudabol/
├── 📄 README.md                    # Este archivo
├── 📄 docker-compose.yml           # Orquestación de contenedores
├── 📄 .env.example                 # Plantilla de variables de entorno
├── 📄 .gitignore                   # Archivos excluidos de git
├── 📄 start_project.bat            # Script de inicio rápido (Windows)
├── 📄 tunnel_config.yml            # Configuración de Cloudflare Tunnel
│
├── 📂 backend/
│   ├── 📄 Dockerfile               # Imagen Docker del backend
│   ├── 📄 .dockerignore
│   ├── 📄 .env.example             # Plantilla de variables del backend
│   ├── 📄 requirements.txt         # Dependencias Python
│   ├── 📄 database.py              # Conexión SQLAlchemy + Supabase
│   ├── 📄 models.py                # Modelos de base de datos (ORM)
│   ├── 📄 schemas.py               # Validación Pydantic
│   └── 📄 main.py                  # API REST, endpoints y lógica de negocio
│
├── 📂 frontend/
│   ├── 📄 Dockerfile               # Imagen Docker (build Node + Nginx)
│   ├── 📄 .dockerignore
│   ├── 📄 nginx.conf               # Configuración del servidor Nginx
│   ├── 📄 package.json
│   ├── 📄 vite.config.js
│   └── 📂 src/
│       ├── 📄 App.jsx              # Componente principal con todos los módulos
│       ├── 📄 index.css            # Estilos globales
│       └── 📄 main.jsx
│
└── 📂 app-integracion/             # Versión prototipo inicial (referencia)
    ├── 📂 backend/
    └── 📂 frontend/
```

---

## 🔐 Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a Supabase PostgreSQL | `postgresql://postgres.xxx:pass@host:5432/postgres` |
| `SECRET_KEY` | Clave secreta para firmar tokens JWT | Cadena aleatoria de 64+ caracteres |
| `ALGORITHM` | Algoritmo de firmado JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token en minutos | `120` |

**Generar una SECRET_KEY segura:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🚀 Despliegue en Servidor VPS / Nube

Para desplegar en un servidor Ubuntu (DigitalOcean, AWS, Railway, etc.):

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ortlumon/diplomadoudabol.git
cd diplomadoudabol

# 2. Configurar el entorno
cp .env.example .env
nano .env  # Rellenar DATABASE_URL y SECRET_KEY

# 3. Levantar con Docker
docker compose up -d --build

# 4. Ver logs
docker compose logs -f
```

---

## 📜 Licencia y Créditos

Desarrollado para el **Diplomado de Tecnologías de la Información - UDABOL**  
Sistema de Compra-Venta e Inventario "Ensilados Santa Cruz"  
Santa Cruz de la Sierra, Bolivia — 2026

**Tecnologías Open Source utilizadas:** FastAPI, SQLAlchemy, Pydantic, React, Vite, Nginx, Supabase, Cloudflare Tunnels.
