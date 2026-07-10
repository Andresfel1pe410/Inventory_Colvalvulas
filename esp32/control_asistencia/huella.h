// Envoltorio sobre Adafruit_Fingerprint para el sensor AS608.
#pragma once
#include <Arduino.h>

void iniciarSensorHuella();
bool sensorHuellaOk();

// Busca una huella puesta en el sensor. Devuelve el fingerprint_id (>=0) si
// hubo coincidencia, o -1 si no hay dedo puesto todavía o no hubo match.
// No bloquea: se puede (y debe) llamar en cada vuelta del loop().
int buscarHuella();

// Enrola una huella nueva en el slot indicado. Es bloqueante (guía al
// operador paso a paso) y usa el callback para que la pantalla muestre cada
// paso ("Coloque el dedo", "Retire el dedo", etc.). Devuelve true si quedó
// guardada correctamente.
typedef void (*CallbackEstadoEnrolar)(const char* mensaje);
bool enrolarHuella(int slot, CallbackEstadoEnrolar onEstado);

// Heurística de slot libre sugerido (cantidad de plantillas ya guardadas).
// El operador puede ajustarlo con +/- antes de confirmar.
int siguienteSlotSugerido();
