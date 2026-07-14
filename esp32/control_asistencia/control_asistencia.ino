// Control de Asistencia Biométrico — ESP32 + AS608 + TFT táctil 2.8"
// Ver README.md antes de compilar (librerías, User_Setup.h de TFT_eSPI,
// calibración de touch) y config.h para WiFi/URL del backend/PIN admin.
#include "config.h"
#include "pines.h"
#include "api.h"
#include "huella.h"
#include "pantallas.h"
#include <WiFi.h>

enum Estado {
  ESTADO_INICIO,
  ESTADO_PROCESANDO,
  ESTADO_RESULTADO,
  ESTADO_SIN_WIFI,
  ESTADO_PIN,
  ESTADO_SLOT,
};

static Estado estado = ESTADO_INICIO;
static unsigned long marcaTiempoEstado = 0;
static unsigned long ultimaActividad = 0;
static unsigned long ultimoToqueProcesado = 0;
static unsigned long ultimaSync = 0;
static unsigned long ultimoIntentoWifi = 0;

static String pinIngresado = "";
static String slotTexto = "";

#define TIMEOUT_INACTIVIDAD_MENU_MS 20000UL

static void cambiarEstado(Estado nuevo) {
  estado = nuevo;
  marcaTiempoEstado = millis();
  ultimaActividad = millis();
}

static void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("No se pudo conectar todavía.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nControl de Asistencia - iniciando");

  iniciarPantalla();
  mostrarEstadoEnrolar("Iniciando...");

  iniciarSensorHuella();
  if (!sensorHuellaOk()) {
    mostrarEstadoEnrolar("Error: sensor de huella no responde");
    delay(3000);
  }

  conectarWifi();
  if (WiFi.status() == WL_CONNECTED) {
    sincronizarEmpleados();
  }

  cambiarEstado(ESTADO_INICIO);
  mostrarInicio();
}

void loop() {
  // ---- Conectividad ----
  if (WiFi.status() != WL_CONNECTED) {
    if (estado != ESTADO_SIN_WIFI) {
      cambiarEstado(ESTADO_SIN_WIFI);
      mostrarSinWifi();
    }
    if (millis() - ultimoIntentoWifi > 10000) {
      ultimoIntentoWifi = millis();
      conectarWifi();
    }
    delay(50);
    return;
  }
  if (estado == ESTADO_SIN_WIFI) {
    cambiarEstado(ESTADO_INICIO);
    mostrarInicio();
    sincronizarEmpleados();
  }

  // ---- Sincronización periódica de empleados ----
  if (millis() - ultimaSync > INTERVALO_SYNC_MS) {
    ultimaSync = millis();
    sincronizarEmpleados();
  }

  // ---- Timeout de inactividad en menús de administrador ----
  if ((estado == ESTADO_PIN || estado == ESTADO_SLOT) &&
      millis() - ultimaActividad > TIMEOUT_INACTIVIDAD_MENU_MS) {
    cambiarEstado(ESTADO_INICIO);
    mostrarInicio();
    delay(50);
    return;
  }

  switch (estado) {
    case ESTADO_INICIO: {
      int tx, ty;
      if (leerToque(tx, ty) && millis() - ultimoToqueProcesado > 300) {
        ultimoToqueProcesado = millis();
        if (tocoEsquinaEnrolar(tx, ty)) {
          pinIngresado = "";
          cambiarEstado(ESTADO_PIN);
          mostrarTecladoPin(pinIngresado);
          break;
        }
      }

      int id = buscarHuella();
      if (id >= 0) {
        cambiarEstado(ESTADO_PROCESANDO);
        mostrarProcesando();

        ResultadoEvento r = registrarEvento(id);
        String nombre = r.employeeName.length() > 0 ? r.employeeName : nombreCacheado(id);
        String mensaje = r.ok ? r.message : "Error de conexión con el servidor";
        mostrarResultado(r.ok && r.success, nombre, mensaje, r.eventType, r.horasSemana, r.horasObjetivo);
        cambiarEstado(ESTADO_RESULTADO);
      } else if (id == -2) {
        mostrarResultado(false, "", "Huella no registrada. Intente de nuevo o contacte al administrador.", "");
        cambiarEstado(ESTADO_RESULTADO);
      }
      break;
    }

    case ESTADO_RESULTADO:
      if (millis() - marcaTiempoEstado > TIEMPO_MOSTRAR_RESULTADO_MS) {
        cambiarEstado(ESTADO_INICIO);
        mostrarInicio();
      }
      break;

    case ESTADO_PIN: {
      int tx, ty;
      if (leerToque(tx, ty) && millis() - ultimoToqueProcesado > 250) {
        ultimoToqueProcesado = millis();
        bool confirmado, cancelado;
        if (tocoTecladoPin(tx, ty, pinIngresado, confirmado, cancelado)) {
          ultimaActividad = millis();
          if (confirmado) {
            if (pinIngresado == String(PIN_ADMIN)) {
              int sugerido = siguienteSlotSugerido();
              slotTexto = String(sugerido >= 1 ? sugerido : 1);
              cambiarEstado(ESTADO_SLOT);
              mostrarTecladoSlot(slotTexto);
            } else {
              mostrarEstadoEnrolar("PIN incorrecto");
              delay(1200);
              cambiarEstado(ESTADO_INICIO);
              mostrarInicio();
            }
          } else {
            actualizarMascaraPin(pinIngresado);
          }
        }
      }
      break;
    }

    case ESTADO_SLOT: {
      int tx, ty;
      if (leerToque(tx, ty) && millis() - ultimoToqueProcesado > 250) {
        ultimoToqueProcesado = millis();
        bool confirmado, cancelado;
        if (tocoTecladoSlot(tx, ty, slotTexto, confirmado, cancelado)) {
          ultimaActividad = millis();
          if (cancelado) {
            cambiarEstado(ESTADO_INICIO);
            mostrarInicio();
          } else if (confirmado) {
            int slot = slotTexto.toInt();
            if (slotTexto.length() == 0 || slot < 1) {
              mostrarEstadoEnrolar("Numero de slot invalido");
              delay(1200);
              mostrarTecladoSlot(slotTexto);
              break;
            }
            bool ok = enrolarHuella(slot, mostrarEstadoEnrolar);
            if (ok) {
              mostrarSlotGuardado(slot);
              delay(4000);
            } else {
              delay(2000);
            }
            cambiarEstado(ESTADO_INICIO);
            mostrarInicio();
            sincronizarEmpleados();
          } else {
            actualizarValorSlot(slotTexto);
          }
        }
      }
      break;
    }

    default:
      break;
  }

  delay(20);
}
