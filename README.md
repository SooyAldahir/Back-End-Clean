# API EDI 301 — Arquitectura Limpia

## Estructura de carpetas

```
src/
├── server.js                        ← Punto de entrada: HTTP + Socket.io + Cron
├── app.js                           ← Express app (middlewares globales, rutas)
│
├── config/
│   └── database.js                  ← Configuración de conexión SQL Server
│
├── infrastructure/                  ← Detalles de implementación externos
│   ├── database/
│   │   ├── db.js                    ← Pool MSSQL + helper queryP()
│   │   └── script_DB.sql            ← Script de base de datos (referencia)
│   ├── storage/
│   │   ├── cloudinary.provider.js   ← Cliente Cloudinary configurado
│   │   └── image.storage.js         ← Procesamiento sharp + upload
│   ├── notifications/
│   │   └── firebase.provider.js     ← Firebase Admin + push individual/multicast
│   └── socket/
│       └── socket.service.js        ← Singleton Socket.io con rooms
│
├── domain/
│   └── repositories/
│       └── queries/                 ← Todas las queries SQL por dominio
│           ├── usuario.queries.js
│           ├── familia.queries.js
│           └── index.queries.js     ← agenda, chat, estados, mensajes,
│                                       publicaciones, solicitudes, provisiones,
│                                       det-provisiones, fotos, miembros
│
├── application/
│   └── use-cases/                   ← Lógica de negocio pura (sin Express)
│       ├── auth/           → login, logout, resetPassword
│       ├── usuarios/       → CRUD + search + token + birthdays
│       ├── familias/       → CRUD + fotos + reporte + search
│       ├── miembros/       → add, remove, bulk, alumnos
│       ├── publicaciones/  → create, list, like, comentarios, estado
│       ├── agenda/         → CRUD de actividades
│       ├── mensajes/       → chat familiar
│       ├── chat/           → salas privadas y grupales
│       ├── estados/        → catálogo + CRUD estados alumno
│       ├── provisiones/    → registros de cenas
│       ├── det-provisiones/→ asistencia por provisión
│       ├── fotos/          → fotos de publicaciones
│       ├── solicitudes/    → solicitudes familiares
│       ├── roles/          → CRUD de roles
│       ├── search/         → búsqueda global
│       └── shared/
│           └── birthday.usecase.js  ← Cron: cumpleaños + recordatorio oración
│
├── interfaces/
│   ├── validators/
│   │   └── index.js                 ← Todos los schemas Joi centralizados
│   └── http/
│       ├── middleware/
│       │   ├── auth.guard.js        ← Verifica session_token en BD
│       │   ├── role.guard.js        ← Verifica rol del usuario
│       │   └── validate.middleware.js ← Valida con schema Joi
│       ├── controllers/             ← Solo reciben req/res, delegan a use-cases
│       │   ├── auth.controller.js
│       │   ├── usuario.controller.js
│       │   ├── familia.controller.js
│       │   ├── miembro.controller.js
│       │   ├── publicacion.controller.js
│       │   ├── agenda.controller.js
│       │   ├── mensaje.controller.js
│       │   ├── chat.controller.js
│       │   ├── estado.controller.js
│       │   ├── provision.controller.js
│       │   ├── det-provision.controller.js
│       │   ├── foto.controller.js
│       │   ├── solicitud.controller.js
│       │   ├── rol.controller.js
│       │   └── search.controller.js
│       └── routes/                  ← Solo define rutas y middlewares
│           ├── index.js
│           ├── auth.routes.js
│           ├── usuario.routes.js
│           ├── familia.routes.js
│           └── ... (una por módulo)
│
└── shared/
    ├── errors/
    │   └── app.error.js             ← AppError, NotFoundError, BadRequestError...
    └── utils/
        ├── http.response.js         ← ok(), created(), bad(), notFound(), fail()
        ├── hash.js                  ← bcrypt helpers
        ├── token.js                 ← UUID session token
        └── name.formatter.js        ← Formato de nombres en español
```

## Principios aplicados

### Separación de responsabilidades
- **Controllers**: solo reciben `req`/`res`, extraen parámetros, llaman un use-case, responden.
- **Use-cases**: toda la lógica de negocio. No conocen Express ni `req`/`res`.
- **Infrastructure**: detalles externos (BD, Firebase, Cloudinary, Socket.io).
- **Queries**: SQL centralizado por entidad, sin lógica.

### Flujo de una request
```
HTTP Request
  → Route (define quién puede y qué validación aplica)
  → Middleware (auth.guard → role.guard → validate)
  → Controller (extrae datos, llama use-case, emite socket, responde)
  → Use-case (lógica de negocio, llama queries e infraestructura)
  → DB / Firebase / Cloudinary
```

### Notificaciones y Sockets
Las notificaciones push (Firebase) y los eventos de socket se disparan dentro de los use-cases usando `setImmediate()` para no bloquear la respuesta HTTP. Los eventos de socket en el controller se emiten después de recibir la respuesta del use-case.

## Variables de entorno requeridas (.env)
```
PORT=3000
DBUSER=
DBPASSWORD=
DBSERVER=
DATABASE=
DBPORT=1433
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
BYPASS_AUTH=0
```
También requiere `serviceAccountKey.json` en la raíz del proyecto para Firebase.
