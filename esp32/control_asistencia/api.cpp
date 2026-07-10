#include "api.h"
#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// Caché en memoria: fingerprint_id -> nombre (arreglos paralelos, tamaño fijo).
static int cacheIds[MAX_EMPLEADOS_CACHE];
static String cacheNombres[MAX_EMPLEADOS_CACHE];
static int cacheTotal = 0;

String nombreCacheado(int fingerprintId) {
  for (int i = 0; i < cacheTotal; i++) {
    if (cacheIds[i] == fingerprintId) return cacheNombres[i];
  }
  return "";
}

bool sincronizarEmpleados() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();  // ver nota de seguridad en config.h

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/device/employees";
  if (!http.begin(client, url)) return false;

  int code = http.GET();
  if (code != 200) {
    http.end();
    Serial.printf("sincronizarEmpleados: HTTP %d\n", code);
    return false;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("sincronizarEmpleados: JSON inválido (%s)\n", err.c_str());
    return false;
  }

  cacheTotal = 0;
  for (JsonObject item : doc.as<JsonArray>()) {
    if (cacheTotal >= MAX_EMPLEADOS_CACHE) break;
    cacheIds[cacheTotal] = item["fingerprint_id"] | -1;
    cacheNombres[cacheTotal] = String((const char*)(item["name"] | ""));
    cacheTotal++;
  }
  Serial.printf("sincronizarEmpleados: %d empleados cacheados\n", cacheTotal);
  return true;
}

ResultadoEvento registrarEvento(int fingerprintId) {
  ResultadoEvento r;
  r.ok = false;
  r.success = false;

  if (WiFi.status() != WL_CONNECTED) {
    r.message = "Sin conexión WiFi";
    return r;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/device/event";
  if (!http.begin(client, url)) {
    r.message = "No se pudo iniciar la conexión";
    return r;
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  JsonDocument reqDoc;
  reqDoc["device_id"] = DEVICE_ID;
  reqDoc["fingerprint_id"] = fingerprintId;
  String body;
  serializeJson(reqDoc, body);

  int code = http.POST(body);
  if (code <= 0) {
    r.message = "No hubo respuesta del servidor";
    http.end();
    return r;
  }

  String payload = http.getString();
  http.end();

  if (code != 200) {
    // El backend respondió pero con error (ej. 400/404/500) — no es el
    // formato {success, employee_name, message} normal.
    r.ok = true;
    r.message = "Error del servidor (" + String(code) + ")";
    return r;
  }

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    r.ok = true;
    r.message = "Respuesta inválida del servidor";
    return r;
  }

  r.ok = true;
  r.success = doc["success"] | false;
  r.employeeName = String((const char*)(doc["employee_name"] | ""));
  r.message = String((const char*)(doc["message"] | ""));
  r.eventType = String((const char*)(doc["event_type"] | ""));
  return r;
}
