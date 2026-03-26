# EDI 301 — Backend API

<div align="center">

```
 ██████╗  █████╗  ██████╗██╗  ██╗    ███████╗███╗   ██╗██████╗
 ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝    ██╔════╝████╗  ██║██╔══██╗
 ██████╔╝███████║██║     █████╔╝     █████╗  ██╔██╗ ██║██║  ██║
 ██╔══██╗██╔══██║██║     ██╔═██╗     ██╔══╝  ██║╚██╗██║██║  ██║
 ██████╔╝██║  ██║╚██████╗██║  ██╗    ███████╗██║ ╚████║██████╔╝
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝
```

**API REST para gestión de familias escolares**  
Node.js · Express · MSSQL · Socket.io · Clean Architecture

![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)
![MSSQL](https://img.shields.io/badge/MSSQL-SQL_Server-CC2927?style=flat-square&logo=microsoftsqlserver)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socketdotio)

</div>

---

## Índice

- [Descripción](#descripción)
- [Ramas del Repositorio](#ramas-del-repositorio)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Variables de Entorno](#variables-de-entorno)
- [Módulos de la API](#módulos-de-la-api)
- [Endpoints Principales](#endpoints-principales)
- [Autenticación](#autenticación)
- [Tiempo Real con Socket.io](#tiempo-real-con-socketio)
- [Almacenamiento de Imágenes](#almacenamiento-de-imágenes)
- [Notificaciones Push](#notificaciones-push)

---

## Descripción

API REST desarrollada en **Node.js + Express** que sirve como backend de la aplicación móvil EDI 301. Gestiona familias escolares, usuarios, publicaciones, mensajes, agenda y más. Incluye soporte para tiempo real con **Socket.io**, notificaciones push con **Firebase Cloud Messaging** y almacenamiento de imágenes con **Cloudinary**.

---

## Ramas del Repositorio

| Rama | Descripción |
|---|---|
| `main` | Clean Architecture — sin framework de DI |
| `di` | Clean Architecture + Inyección de Dependencias (Constructor Injection + contenedor manual) |

```bash
git checkout main   # versión Clean Architecture
git checkout di     # versión con DI
```

---

## Arquitectura

El proyecto implementa **Clean Architecture** con separación estricta en 4 capas:

```
┌──────────────────────────────────────────────────────────┐
│                    INTERFACES (HTTP)                      │
│         Controllers  ←  Routes  ←  Middleware             │
├──────────────────────────────────────────────────────────┤
│                     APPLICATION                           │
│                     Use Cases                             │
├──────────────────────────────────────────────────────────┤
│                       DOMAIN                              │
│               Queries  |  Entities                        │
├──────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE                          │
│       Database  |  Storage  |  Notifications  |  Socket   │
└──────────────────────────────────────────────────────────┘
```

**Regla de dependencias:** cada capa solo conoce la capa inmediatamente inferior. Los use cases nunca importan controllers; los controllers nunca importan infraestructura directamente.

### Rama `di` — Inyección de Dependencias

En la rama `di` se agrega un contenedor DI manual:

```
bootstrap.js  →  container.js
     │
     ├── register('db',              () => require('./database/db'))
     ├── register('authUseCase',     (c) => new AuthUseCase(c.get('db'), ...))
     ├── register('authController',  (c) => new AuthController(c.get('authUseCase')))
     └── ...
```

Los módulos migrados a DI son: `auth`, `familias`, `usuarios`.

---

## Estructura del Proyecto

```
src/
├── server.js                          # Arranque del servidor HTTP + Socket.io
├── app.js                             # Express: middleware, rutas, static files
│
├── config/
│   └── database.js                    # Configuración de conexión MSSQL
│
├── infrastructure/                    # Implementaciones externas
│   ├── database/
│   │   ├── db.js                      # Pool de conexiones MSSQL + queryP()
│   │   └── script_DB.sql              # Script de creación de BD
│   ├── storage/
│   │   ├── cloudinary.provider.js     # Cliente Cloudinary
│   │   └── image.storage.js           # Optimización y subida de imágenes (sharp)
│   ├── notifications/
│   │   └── firebase.provider.js       # Firebase Admin SDK (FCM multicast)
│   └── socket/
│       └── socket.service.js          # Gestión de rooms y eventos Socket.io
│
├── domain/                            # Reglas de negocio puras
│   └── repositories/
│       └── queries/
│           ├── usuario.queries.js     # SQL para usuarios
│           ├── familia.queries.js     # SQL para familias
│           └── index.queries.js       # SQL para todos los demás módulos
│
├── application/                       # Casos de uso
│   └── use-cases/
│       ├── auth/                      # Login, logout, reset password
│       ├── usuarios/                  # CRUD usuarios, búsqueda, FCM token
│       ├── familias/                  # CRUD familias, miembros, fotos
│       ├── miembros/                  # Agregar/eliminar miembros
│       ├── publicaciones/             # Feed, likes, comentarios, aprobación
│       ├── agenda/                    # Eventos, recordatorios
│       ├── mensajes/                  # Mensajes de chat familiar
│       ├── chat/                      # Chat privado, grupos
│       ├── estados/                   # Estados de usuario (activo, ausente...)
│       ├── fotos/                     # Galería de fotos de familia
│       ├── solicitudes/               # Solicitudes de ingreso a familia
│       ├── provisiones/               # Provisiones escolares
│       ├── det-provisiones/           # Detalle de provisiones
│       ├── roles/                     # Roles del sistema
│       ├── search/                    # Búsqueda global
│       └── shared/
│           └── birthday.usecase.js    # Cron job de cumpleaños
│
├── interfaces/                        # Adaptadores HTTP
│   └── http/
│       ├── controllers/               # Un controller por módulo
│       ├── routes/                    # Un archivo de rutas por módulo
│       │   └── index.js               # Router principal que monta todas las rutas
│       └── middleware/
│           ├── auth.guard.js          # Verificación de session_token
│           ├── role.guard.js          # Control de acceso por rol
│           └── validate.middleware.js # Validación de body con Joi
│
└── shared/
    ├── errors/
    │   └── app.error.js               # BadRequestError, NotFoundError, UnauthorizedError
    └── utils/
        ├── hash.js                    # bcrypt (hashPassword, comparePassword)
        ├── token.js                   # Generación de session tokens
        ├── http.response.js           # Helpers: ok(), created(), bad(), notFound(), fail()
        └── name.formatter.js          # Formateo de nombres en español
```

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| SQL Server | 2019+ |
| Cuenta Cloudinary | Free tier o superior |
| Proyecto Firebase | Con Cloud Messaging habilitado |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/SooyAldahir/Back-End-Clean.git
cd Back-End-Clean

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# 4. Crear la base de datos
# Ejecuta src/infrastructure/database/script_DB.sql en SQL Server Management Studio

# 5. Iniciar en desarrollo (con nodemon)
npm run dev

# 6. Iniciar en producción
npm start
```

---

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# ─── Base de Datos ────────────────────────────────────────
DB_USER=sa
DB_PASSWORD=tu_password
DB_SERVER=localhost
DB_DATABASE=EDI301
DB_PORT=1433

# ─── Servidor ─────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ─── Cloudinary ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# ─── Firebase ─────────────────────────────────────────────
# Ruta al archivo serviceAccountKey.json (NO subir a Git)
FIREBASE_CREDENTIAL_PATH=./serviceAccountKey.json

# ─── Auth ─────────────────────────────────────────────────
JWT_SECRET=tu_secreto_muy_largo_y_seguro
```

> ⚠️ **Nunca** subas `.env` ni `serviceAccountKey.json` a Git — ya están en `.gitignore`.  
> Si lo subiste accidentalmente: revoca la clave en Google Cloud Console y genera una nueva.

---

## Módulos de la API

Todos los endpoints están bajo el prefijo `/api/`.

| Módulo | Ruta base | Descripción |
|---|---|---|
| Auth | `/api/auth` | Login, logout, reset password |
| Usuarios | `/api/usuarios` | CRUD, búsqueda, FCM token |
| Familias | `/api/familias` | CRUD familias, fotos, descripción |
| Miembros | `/api/miembros` | Agregar/eliminar integrantes |
| Publicaciones | `/api/publicaciones` | Feed, likes, comentarios, aprobación |
| Agenda | `/api/agenda` | Eventos escolares |
| Mensajes | `/api/mensajes` | Chat familiar |
| Chat | `/api/chat` | Chat privado y grupal |
| Estados | `/api/estados` | Estado de presencia del alumno |
| Fotos | `/api/fotos` | Galería de fotos de familia |
| Solicitudes | `/api/solicitudes` | Solicitudes de familia |
| Provisiones | `/api/provisiones` | Provisiones escolares |
| Detalle Prov. | `/api/detalle-provision` | Detalle de provisiones |
| Roles | `/api/roles` | Roles del sistema |
| Búsqueda | `/api/search` | Búsqueda global de usuarios y familias |

---

## Endpoints Principales

### Auth

```
POST   /api/auth/login           Body: { login, password }
POST   /api/auth/logout          Header: Authorization: Bearer <token>
POST   /api/auth/reset-password  Body: { correo, nuevaContrasena }
```

### Usuarios

```
GET    /api/usuarios                    ?tipo=ALUMNO&q=juan
GET    /api/usuarios/:id
POST   /api/usuarios                    Body: datos del usuario
PUT    /api/usuarios/:id                Body/multipart: datos + foto (campo: 'foto')
DELETE /api/usuarios/:id
PATCH  /api/usuarios/:id/email          Body: { correo }
PUT    /api/usuarios/update-token       Body: { id_usuario, token }
GET    /api/usuarios/cumpleanos
GET    /api/usuarios/familias/by-doc/search  ?matricula=123 | ?numEmpleado=456
```

### Familias

```
GET    /api/familias                    Lista todas
GET    /api/familias/available          Para asignar alumnos
GET    /api/familias/reporte-completo   Reporte con miembros
GET    /api/familias/search             ?name=García
GET    /api/familias/por-ident/:ident   Buscar por matrícula/empleado
GET    /api/familias/:id
POST   /api/familias                    Body: { nombre_familia, residencia, papa_id, mama_id, hijos[] }
PUT    /api/familias/:id
DELETE /api/familias/:id
PATCH  /api/familias/:id/fotos          Multipart: foto_perfil, foto_portada
PATCH  /api/familias/:id/descripcion    Body: { descripcion }
```

### Publicaciones (Feed)

```
GET    /api/publicaciones/feed/global        Paginado: ?page=1&limit=50
GET    /api/publicaciones/familia/:id        Feed por familia
GET    /api/publicaciones/familia/:id/pendientes
GET    /api/publicaciones/mis-posts
POST   /api/publicaciones                    Multipart: mensaje, imagen, id_familia
PUT    /api/publicaciones/:id/estado         Body: { estado: 'Publicado' | 'Rechazada' }
DELETE /api/publicaciones/:id
POST   /api/publicaciones/:id/like
GET    /api/publicaciones/:id/comentarios
POST   /api/publicaciones/:id/comentarios    Body: { contenido }
DELETE /api/publicaciones/comentarios/:id
```

---

## Autenticación

La API usa **session tokens** almacenados en la base de datos (no JWT stateless).

```
Cada request autenticado debe incluir:
Authorization: Bearer <session_token>
```

El middleware `auth.guard.js` valida el token contra la tabla `EDI.Usuarios.session_token`.

### Roles disponibles

| Rol | Permisos |
|---|---|
| `Admin` | Acceso total |
| `PapaEDI` / `MamaEDI` | Gestión familiar, aprobación de posts |
| `Padre` / `Madre` / `Tutor` | Igual que PapaEDI/MamaEDI |
| `HijoEDI` / `Hijo` / `Alumno` | Solo lectura, chat, feed |

---

## Tiempo Real con Socket.io

El servidor mantiene rooms para notificaciones en tiempo real:

```javascript
// Rooms disponibles
`user_${id_usuario}`      // Eventos personales
`familia_${id_familia}`   // Eventos de la familia
'institucional'           // Eventos globales (todos los usuarios)
`chat_${id_sala}`         // Mensajes de chat privado/grupal
```

### Eventos emitidos por el servidor

| Evento | Room | Descripción |
|---|---|---|
| `feed_actualizado` | `institucional` | Nueva publicación aprobada |
| `post_creado` | `familia_X` | Post nuevo en la familia |
| `post_estado_actualizado` | `user_X` | Tu post fue aprobado/rechazado |
| `nuevo_mensaje` | `chat_X` | Mensaje en chat privado |
| `nuevo_mensaje_familia` | `familia_X` | Mensaje en chat familiar |
| `evento_creado` | `institucional` | Nuevo evento en agenda |
| `familia_creada` | `institucional` | Nueva familia registrada |
| `cumpleanos_hoy` | `institucional` | Recordatorio de cumpleaños (cron) |

---

## Almacenamiento de Imágenes

Las imágenes se procesan con **sharp** (optimización) y se suben a **Cloudinary**:

```
Flujo:
  archivo recibido (express-fileupload)
    → validación (tipo MIME, tamaño máx 5MB)
    → redimensionado y compresión (sharp)
    → subida a Cloudinary
    → URL guardada en BD
```

Carpetas en Cloudinary:
- `edi301/perfiles/` — fotos de perfil de usuarios
- `edi301/familias/` — fotos de perfil y portada de familias
- `edi301/publicaciones/` — imágenes de posts
- `edi301/agenda/` — imágenes de eventos

---

## Notificaciones Push

Se usa **Firebase Admin SDK** para enviar notificaciones multicast a dispositivos registrados:

```javascript
// Ejemplo: notificar a los padres de una familia
const tokens = await queryP(Q.getPadresFamilia, { idFam });
await sendMulticastNotification(tokens, {
  title: 'Nueva publicación',
  body:  'Hay un nuevo post en tu familia',
  data:  { tipo: 'POST', id_familia: String(id_familia) },
});
```

Los tokens FCM se actualizan automáticamente desde la app Flutter al iniciar sesión.

---

<div align="center">

Desarrollado con ❤️ para Capellania Universitaria - Universidad Linda Vista SA. de CV.

</div>