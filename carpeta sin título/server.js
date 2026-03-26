require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { SocketService } = require('./infrastructure/socket/socket.service');
const { initCronJobs } = require('./application/use-cases/shared/birthday.usecase');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

SocketService.init(io);
app.set('socketio', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  initCronJobs();
});
