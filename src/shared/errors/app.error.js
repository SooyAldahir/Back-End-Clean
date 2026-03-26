class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'No encontrado') {
    super(message, 404);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(message, 400);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401);
  }
}

module.exports = { AppError, NotFoundError, BadRequestError, ForbiddenError, UnauthorizedError };
