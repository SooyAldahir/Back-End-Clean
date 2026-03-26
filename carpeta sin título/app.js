require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const router = require('./interfaces/http/routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(fileUpload({
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
}));

// Inyectar socket.io en cada request
app.use((req, _res, next) => {
  req.io = app.get('socketio');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', router);

app.get('/', (_req, res) => {
  res.json({
    message: 'API EDI 301',
    rutas: [
      '/api/auth', '/api/usuarios', '/api/familias', '/api/miembros',
      '/api/publicaciones', '/api/fotos', '/api/agenda', '/api/search',
      '/api/roles', '/api/estados', '/api/solicitudes', '/api/provisiones',
      '/api/detalle-provision', '/api/mensajes', '/api/chat',
    ],
  });
});

module.exports = app;
