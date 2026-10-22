# 🚀 Guía Definitiva de Despliegue en Coolify

> **Proyecto:** Sistema de Compra-Venta, Inventario Estricto y Kardex de Auditoría  
> **Dominio de Producción Web:** `https://diplomado.cerice360.com`  
> **Dominio de Producción API:** `https://api.diplomado.cerice360.com`  
> **Base de Datos:** PostgreSQL gestionado en Supabase  
> **Servidor:** Ubuntu Server con Coolify instalado

---

## 📋 Resumen de Despliegue

Coolify puede desplegar este proyecto de **dos formas sencillas**. La opción recomendada para mayor independencia y control de dominios es **Servicios Separados (Backend + Frontend)** o mediante **Docker Compose**.

---

## 🛠️ Opción 1: Despliegue como Servicios Separados (Recomendado)

### 1. Desplegar el Backend (FastAPI)

1. En el panel de **Coolify**, ve a tu Proyecto y haz clic en **+ New Resource** → **Public Repository** o **Private Repository (GitHub)**.
2. Selecciona o ingresa la URL: `https://github.com/Reqiudex/diplomadoudabol`
3. Rama: `main`
4. **Configuración de Construcción:**
   - **Build Pack:** `Dockerfile`
   - **Base Directory:** `/backend`
   - **Dockerfile Location:** `/Dockerfile`
   - **Exposed Port:** `8000`
5. **Dominio Público:** Configura `https://api.diplomado.cerice360.com`
6. **Variables de Entorno (Environment Variables):**
   Agrega las siguientes variables en la pestaña de variables:

   | Variable | Valor | Nota |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://postgres.xxx:tu_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres` | Cadena IPv4 Pooler de Supabase |
   | `JWT_SECRET_KEY` | *(Cadena aleatoria de 64 caracteres)* | Clave para firmar tokens |
   | `SECRET_KEY` | *(Mismo valor que JWT_SECRET_KEY)* | Compatibilidad |
   | `PORT` | `8000` | Puerto interno |
   | `CORS_ORIGINS` | `https://diplomado.cerice360.com,http://diplomado.cerice360.com` | Origen del frontend |

7. **Healthcheck:**
   - Path: `/health`
   - Port: `8000`
8. Haz clic en **Deploy**.

---

### 2. Desplegar el Frontend (React + Vite + Nginx)

1. En Coolify, dentro del mismo proyecto, haz clic en **+ New Resource** → Repositorio `https://github.com/Reqiudex/diplomadoudabol`.
2. Rama: `main`
3. **Configuración de Construcción:**
   - **Build Pack:** `Dockerfile`
   - **Base Directory:** `/frontend`
   - **Dockerfile Location:** `/Dockerfile`
   - **Exposed Port:** `80`
4. **Dominio Público:** Configura `https://diplomado.cerice360.com`
5. **Variables de Entorno de Construcción (Build Environment Variables):**
   Agrega:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://api.diplomado.cerice360.com/api/v1` |

6. Haz clic en **Deploy**.

---

## 🐳 Opción 2: Despliegue con Docker Compose (Todo en Uno)

1. En **Coolify**, haz clic en **+ New Resource** → **Docker Compose**.
2. Selecciona el repositorio `https://github.com/Reqiudex/diplomadoudabol`, rama `main`.
3. Coolify detectará automáticamente `docker-compose.yml`.
4. En la sección de **Environment Variables**, configura:
   ```env
   DATABASE_URL=postgresql://postgres.xxx:tu_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   JWT_SECRET_KEY=clave_secreta_super_segura_de_produccion_2026
   SECRET_KEY=clave_secreta_super_segura_de_produccion_2026
   CORS_ORIGINS=https://diplomado.cerice360.com,http://diplomado.cerice360.com
   VITE_API_URL=https://api.diplomado.cerice360.com/api/v1
   ```
5. En la configuración de dominios de los servicios dentro de Coolify:
   - Asigna al servicio `frontend`: `https://diplomado.cerice360.com`
   - Asigna al servicio `backend`: `https://api.diplomado.cerice360.com`
6. Haz clic en **Deploy**.

---

## 🗄️ Procedimiento de Migraciones (Supabase PostgreSQL)

Las tablas y columnas requeridas (`users`, `products`, `suppliers`, `customers`, `purchases`, `purchase_items`, `sales`, `sale_items`, `kardex_movements`) **ya se encuentran aplicadas y sincronizadas** en la base de datos de Supabase.

Si en el futuro deseas aplicar nuevas revisiones de Alembic desde la terminal del contenedor o localmente:
```bash
# Dentro del contenedor backend:
alembic upgrade head
```

---

## 👤 Creación del Primer Usuario Administrador

Para acceder inicialmente al sistema, cuentas con credenciales preconfiguradas:
- **Usuario:** `admin`
- **Contraseña:** `123456`

Para registrar un nuevo usuario formal con hash seguro `bcrypt` y rol `ADMIN`:
Envía una petición POST autenticada o mediante Swagger UI (`/docs`):
```bash
curl -X POST "https://api.diplomado.cerice360.com/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Administrador General",
    "email": "admin@cerice360.com",
    "password": "PasswordMuySeguro2026!",
    "rol": "ADMIN"
  }'
```

---

## ✅ Lista de Verificación Posterior al Despliegue

- [ ] `https://api.diplomado.cerice360.com/health` responde `{"status": "healthy"}` con código HTTP 200.
- [ ] `https://api.diplomado.cerice360.com/docs` carga la documentación interactiva Swagger.
- [ ] `https://diplomado.cerice360.com` carga la interfaz React con estilos completos.
- [ ] Iniciar sesión en la pestaña **Login JWT** con `admin` / `123456`.
- [ ] Realizar una venta de prueba en **Ventas**: verificar descuento en **Inventario** y registro cronológico en **Kardex de Auditoría**.
- [ ] Probar validación de stock: intentar vender una cantidad mayor a la existente y verificar que el sistema rechace con mensaje explicativo sin dejar cambios huérfanos.
