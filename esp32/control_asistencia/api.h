// Llamadas HTTP al backend (POST /device/event, GET /device/employees).
#pragma once
#include <Arduino.h>

struct ResultadoEvento {
  bool ok;              // si la petición HTTP en sí funcionó (no confundir con "success" del negocio)
  bool success;         // campo "success" de la respuesta del backend
  String employeeName;  // nombre del empleado, si lo hubo
  String message;       // mensaje para mostrar en pantalla
  String eventType;     // ENTRY, LUNCH_START, etc. — puede venir vacío
};

// Registra el evento del fingerprint_id leído. Nunca bloquea más de unos
// segundos: si no hay WiFi o el backend no responde, ok=false.
ResultadoEvento registrarEvento(int fingerprintId);

// Descarga la lista de empleados activos con huella y la guarda en el caché
// en memoria (ver empleadoCache.h). Devuelve true si pudo sincronizar.
bool sincronizarEmpleados();

// Nombre cacheado para un fingerprint_id, o "" si no está en caché todavía.
String nombreCacheado(int fingerprintId);
