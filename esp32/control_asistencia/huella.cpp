#include "huella.h"
#include "pines.h"
#include <Adafruit_Fingerprint.h>

static HardwareSerial serialHuella(2);  // UART2
static Adafruit_Fingerprint finger(&serialHuella);
static bool sensorOk = false;

// 57600 es el baudrate de fábrica más común en los AS608, pero algunos
// clones vienen en otro valor — se prueban varios para no depender de
// adivinar cuál trae el tuyo.
static const uint32_t BAUDIOS_A_PROBAR[] = {57600, 9600, 19200, 38400, 115200};

void iniciarSensorHuella() {
  for (unsigned int i = 0; i < sizeof(BAUDIOS_A_PROBAR) / sizeof(BAUDIOS_A_PROBAR[0]); i++) {
    uint32_t baud = BAUDIOS_A_PROBAR[i];
    Serial.printf("Probando AS608 a %u baudios...\n", baud);
    serialHuella.begin(baud, SERIAL_8N1, PIN_HUELLA_RX, PIN_HUELLA_TX);
    delay(300);  // tiempo de arranque del sensor tras cambiar el baudrate

    if (finger.verifyPassword()) {
      sensorOk = true;
      Serial.printf(">>> Sensor AS608 detectado a %u baudios.\n", baud);
      finger.getTemplateCount();
      return;
    }
    serialHuella.end();
    delay(100);
  }

  sensorOk = false;
  Serial.println("No se pudo comunicar con el AS608 en ningún baudrate probado.");
  Serial.println("Revisa: TX del sensor -> GPIO16, RX del sensor -> GPIO17 (cruzados, no derecho), VCC y GND.");
}

bool sensorHuellaOk() {
  return sensorOk;
}

int buscarHuella() {
  if (!sensorOk) return -1;

  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return -1;  // nadie ha puesto el dedo, nada que avisar
  if (p != FINGERPRINT_OK) return -2;        // hubo dedo pero la imagen salió mala

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -2;  // dedo puesto, no se pudo procesar

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -2;  // dedo puesto, no hubo coincidencia registrada

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
