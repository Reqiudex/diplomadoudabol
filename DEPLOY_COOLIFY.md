# 🚀 Guía Definitiva de Despliegue en Servidor y Coolify

> **Proyecto:** Sistema de Compra-Venta, Inventario Estricto y Kardex de Auditoría  
> **Dominio Público Web:** `https://diplomado.cerice360.com`  
> **Dominio Público API:** `https://apidiplomado.cerice360.com`  
> **Dominio Administrador de BD (pgAdmin 4):** `https://diplomadodb.cerice360.com`  
> **Base de Datos:** PostgreSQL en Supabase (`diplomado_udabol`)  
> **Servidor:** Ubuntu Server + Docker + Cloudflare Zero Trust Tunnel

---

## 📋 Arquitectura de Puertos y Servicios en Servidor

En el servidor de producción actual, los servicios corren bajo los siguientes puertos y hostnames:

| Servicio | Contenedor | Puerto Local | Dominio Cloudflare / Ingress |
|---|---|---|---|
| **Frontend Web** | `diplomado_frontend` | `8088` (Nginx) | `https://diplomado.cerice360.com` |
| **Backend REST API** | `diplomado_backend` | `8089` (Uvicorn) | `https://apidiplomado.cerice360.com` *(y `api.diplomado.cerice360.com`)* |
| **pgAdmin 4** | `diplomado_pgadmin` | `8090` (Web) | `https://diplomadodb.cerice360.com` |
| **PostgreSQL** | `supabase-db-bx4ixq11kl7vwnrall5bdty0` | `5432` | Red interna de Docker `coolify` |

---

## 🛠️ Despliegue en Producción (Docker Compose)

El proyecto cuenta con un archivo optimizado para producción: `docker-compose.prod.yml`.

### 1. Variables de Entorno (`.env.prod`)

Configura el archivo `.env.prod` en la raíz del proyecto:

```env
# Conexión a PostgreSQL (Supabase en red coolify)
DATABASE_URL=postgresql://diplomado_user:MwUe1yEKY1OVdoN0JHbaJpD2@supabase-db-bx4ixq11kl7vwnrall5bdty0:5432/diplomado_udabol

# Seguridad JWT
SECRET_KEY=tu_clave_secreta_jwt_de_produccion_2026
JWT_SECRET_KEY=tu_clave_secreta_jwt_de_produccion_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# CORS
CORS_ORIGINS=https://diplomado.cerice360.com,http://diplomado.cerice360.com,https://apidiplomado.cerice360.com,http://apidiplomado.cerice360.com

# Frontend
VITE_API_URL=/api/v1

# Integración con Slack (Webhook)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/TU_TEAM_ID/TU_BOT_ID/TU_SECRET_TOKEN
```

### 2. Construcción y Lanzamiento

```bash
# Compilar e iniciar los servicios de producción
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## 🌐 Configuración del Túnel Cloudflare (`/etc/cloudflared/config.yml`)

Las rutas públicas hacia los contenedores locales están configuradas de la siguiente manera:

```yaml
ingress:
  # Frontend Diplomado UDABOL
  - hostname: diplomado.cerice360.com
    service: http://localhost:8088

  # Backend Diplomado API (Swagger, Redoc, Endpoints)
  - hostname: apidiplomado.cerice360.com
    service: http://localhost:8089
  - hostname: api.diplomado.cerice360.com
    service: http://localhost:8089

  # Administración de Base de Datos pgAdmin
  - hostname: diplomadodb.cerice360.com
    service: http://localhost:8090

  - service: http_status:404
```

---

## 🗄️ Acceso a la Base de Datos con pgAdmin 4

Para administrar las 9 tablas, realizar consultas SQL o auditar el Kardex:

1. Ingresa a [https://diplomadodb.cerice360.com](https://diplomadodb.cerice360.com)
2. Credenciales pgAdmin:
   - **Email:** `admin@cerice360.com`
   - **Password:** `tCRrf20gexaPSXocxZvI`
3. En el árbol de servidores, conecta a:
   - **Host:** `supabase-db-bx4ixq11kl7vwnrall5bdty0`
   - **Puerto:** `5432`
   - **Maintenance Database:** `diplomado_udabol`
   - **Username:** `diplomado_user`
   - **Password:** `MwUe1yEKY1OVdoN0JHbaJpD2`

---

## 👤 Credenciales Iniciales de la Aplicación

- **Usuario:** `admin`
- **Contraseña:** `123456` *(o `123`)*
- **Rol:** `ADMIN`

---

## ✅ Verificación Posterior al Despliegue

- [x] `https://apidiplomado.cerice360.com/health` responde `{"status": "healthy"}` con código HTTP 200.
- [x] `https://apidiplomado.cerice360.com/docs` carga la documentación interactiva Swagger.
- [x] `https://diplomado.cerice360.com` carga la interfaz React con visor 3D, catálogo e inventario.
- [x] `https://diplomadodb.cerice360.com` permite iniciar sesión y explorar el esquema relacional.
- [x] Notificaciones automáticas a Slack al registrar nuevos productos.
