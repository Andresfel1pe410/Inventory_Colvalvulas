#include "huella.h"
#include "pines.h"
#include <Adafruit_Fingerprint.h>

static HardwareSerial serialHuella(2);  // UART2
static Adafruit_Fingerprint finger(&serialHuella);
static bool sensorOk = false;

void iniciarSensorHuella() {
  serialHuella.begin(57600, SERIAL_8N1, PIN_HUELLA_RX, PIN_HUELLA_TX);
  delay(50);
  sensorOk = finger.verifyPassword();
  if (sensorOk) {
    Serial.println("Sensor AS608 detectado correctamente.");
    finger.getTemplateCount();
  } else {
    Serial.println("No se pudo comunicar con el sensor AS608 (revisa cableado/pines).");
  }
}

bool sensorHuellaOk() {
  return sensorOk;
}

int buscarHuella() {
  if (!sensorOk) return -1;

  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;  // sin dedo puesto, o error de lectura

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;  // no hubo coincidencia

  return finger.fingerID;
}

int siguienteSlotSugerido() {
  if (!sensorOk) return 1;
  finger.getTemplateCount();
  return finger.templateCount;
}

static bool esperarDedo(CallbackEstadoEnrolar onEstado, const char* mensajeEsperando) {
  onEstado(mensajeEsperando);
  uint8_t p = -1;
  unsigned long inicio = millis();
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (millis() - inicio > 10000) {
      onEstado("Tiempo agotado. Intenta de nuevo.");
      return false;
    }
    delay(50);
  }
  return true;
}

static bool esperarRetirarDedo() {
  uint8_t p = finger.getImage();
  unsigned long inicio = millis();
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    if (millis() - inicio > 5000) break;
    delay(50);
  }
  return true;
}

bool enrolarHuella(int slot, CallbackEstadoEnrolar onEstado) {
  if (!sensorOk) {
    onEstado("Sensor no disponible");
    return false;
  }

  if (!esperarDedo(onEstado, "Coloque el dedo...")) return false;
  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    onEstado("No se pudo leer la huella. Intenta de nuevo.");
    return false;
  }

  onEstado("Retire el dedo");
  esperarRetirarDedo();
  delay(500);

  if (!esperarDedo(onEstado, "Coloque el mismo dedo otra vez...")) return false;
  if (finger.image2Tz(2) != FINGERPRINT_OK) {
    onEstado("No se pudo leer la huella. Intenta de nuevo.");
    return false;
  }

  onEstado("Procesando...");
  if (finger.createModel() != FINGERPRINT_OK) {
    onEstado("Las dos lecturas no coinciden. Intenta de nuevo.");
    return false;
  }

  if (finger.storeModel(slot) != FINGERPRINT_OK) {
    onEstado("No se pudo guardar en el sensor.");
    return false;
  }

  return true;
}
