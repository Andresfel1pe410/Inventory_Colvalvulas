"""Excepciones de dominio. `main.py` las convierte en respuestas HTTP
(ver `app_exception_handler` allí)."""


class AppException(Exception):
    """Excepción base de la aplicación."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppException):
    """Recurso no encontrado."""

    def __init__(self, message: str = "Recurso no encontrado"):
        super().__init__(message, status_code=404)


class ValidationError(AppException):
    """Error de validación."""

    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class ForbiddenError(AppException):
    """Acceso denegado."""

    def __init__(self, message: str = "Acceso denegado"):
        super().__init__(message, status_code=403)
