let _io = null;

class SocketService {
  static init(io) {
    _io = io;
    io.on('connection', (socket) => {
      console.log('Usuario conectado:', socket.id);

      socket.on('join_room', (roomId) => {
        socket.join(roomId);
        socket.emit('joined_room', { roomId, socketId: socket.id });
      });

      socket.on('leave_room', (roomId) => {
        socket.leave(roomId);
        socket.emit('left_room', { roomId, socketId: socket.id });
      });

      socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
      });
    });
  }

  static get io() {
    return _io;
  }

  static emit(event, data) {
    _io?.emit(event, data);
  }

  static emitToRoom(room, event, data) {
    _io?.to(room).emit(event, data);
  }
}

module.exports = { SocketService };
