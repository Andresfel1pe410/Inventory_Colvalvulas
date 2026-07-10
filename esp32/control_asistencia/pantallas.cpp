#include "pantallas.h"
#include "pines.h"
#include "config.h"
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include <SPI.h>
#include <string.h>

static TFT_eSPI tft = TFT_eSPI();
static XPT2046_Touchscreen ts(PIN_TOUCH_CS, PIN_TOUCH_IRQ);

#define ANCHO 320
#define ALTO  240

void iniciarPantalla() {
  tft.init();
  tft.setRotation(1);  // landscape, 320x240
  tft.fillScreen(TFT_BLACK);

  ts.begin();
  ts.setRotation(1);
}

bool leerToque(int &tx, int &ty) {
  if (!ts.touched()) return false;
  TS_Point p = ts.getPoint();
  Serial.printf("touch raw x=%d y=%d\n", p.x, p.y);  // útil para calibrar TOUCH_RAW_*

  tx = map(p.x, TOUCH_RAW_X_MIN, TOUCH_RAW_X_MAX, 0, ANCHO);
  ty = map(p.y, TOUCH_RAW_Y_MIN, TOUCH_RAW_Y_MAX, 0, ALTO);
  tx = constrain(tx, 0, ANCHO - 1);
  ty = constrain(ty, 0, ALTO - 1);
  return true;
}

static bool dentroDeBoton(int tx, int ty, int bx, int by, int bw, int bh) {
  return tx >= bx && tx <= (bx + bw) && ty >= by && ty <= (by + bh);
}

static void dibujarBoton(int x, int y, int w, int h, const char *label, uint16_t color) {
  tft.fillRoundRect(x, y, w, h, 6, color);
  tft.drawRoundRect(x, y, w, h, 6, TFT_WHITE);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, color);
  tft.setTextSize(2);
  tft.drawString(label, x + w / 2, y + h / 2);
  tft.setTextDatum(TL_DATUM);
}

// ---------- Pantalla de inicio ----------
void mostrarInicio() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(3);
  tft.drawString("Control de Asistencia", ANCHO / 2, 90);
  tft.setTextSize(2);
  tft.drawString("Coloque su huella", ANCHO / 2, 140);
  tft.setTextDatum(TL_DATUM);

  // Esquina para entrar a enrolar (discreta, no es la acción del día a día)
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Enrolar", ANCHO - 55, 8);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
}

bool tocoEsquinaEnrolar(int tx, int ty) {
  return dentroDeBoton(tx, ty, ANCHO - 65, 0, 65, 24);
}

// ---------- Procesando / resultado ----------
void mostrarProcesando() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Procesando...", ANCHO / 2, ALTO / 2);
  tft.setTextDatum(TL_DATUM);
}

static const char *etiquetaEvento(const String &eventType) {
  if (eventType == "ENTRY") return "Entrada";
  if (eventType == "BREAKFAST_START") return "Inicio de desayuno";
  if (eventType == "BREAKFAST_END") return "Fin de desayuno";
  if (eventType == "LUNCH_START") return "Inicio de almuerzo";
  if (eventType == "LUNCH_END") return "Fin de almuerzo";
  if (eventType == "EXIT") return "Salida";
  return "";
}

void mostrarResultado(bool success, const String &nombre, const String &mensaje, const String &eventType) {
  tft.fillScreen(TFT_BLACK);
  uint16_t color = success ? TFT_GREEN : TFT_RED;

  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(color, TFT_BLACK);
  tft.setTextSize(4);
  tft.drawString(success ? "OK" : "X", ANCHO / 2, 55);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  if (nombre.length() > 0) {
    tft.drawString(nombre, ANCHO / 2, 110);
  }

  const char *etiqueta = etiquetaEvento(eventType);
  if (strlen(etiqueta) > 0) {
    tft.setTextSize(2);
    tft.setTextColor(color, TFT_BLACK);
    tft.drawString(etiqueta, ANCHO / 2, 145);
  }

  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString(mensaje, ANCHO / 2, 185);
  tft.setTextDatum(TL_DATUM);
}

void mostrarSinWifi() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_ORANGE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Sin conexión WiFi", ANCHO / 2, ALTO / 2 - 15);
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Reintentando...", ANCHO / 2, ALTO / 2 + 15);
  tft.setTextDatum(TL_DATUM);
}

// ---------- Teclado numérico (PIN) ----------
static const char *KEYPAD_LABELS[4][3] = {
  {"1", "2", "3"},
  {"4", "5", "6"},
  {"7", "8", "9"},
  {"C", "0", "OK"},
};
#define KEYPAD_BTN_W 80
#define KEYPAD_BTN_H 34
#define KEYPAD_GAP_X 8
#define KEYPAD_GAP_Y 8
#define KEYPAD_START_X ((ANCHO - (3 * KEYPAD_BTN_W + 2 * KEYPAD_GAP_X)) / 2)
#define KEYPAD_START_Y 78

void mostrarTecladoPin(const String &pinIngresado) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Ingrese el PIN", ANCHO / 2, 20);

  String mascara = "";
  for (unsigned int i = 0; i < pinIngresado.length(); i++) mascara += "*";
  tft.setTextSize(3);
  tft.drawString(mascara, ANCHO / 2, 52);
  tft.setTextDatum(TL_DATUM);

  for (int fila = 0; fila < 4; fila++) {
    for (int col = 0; col < 3; col++) {
      int x = KEYPAD_START_X + col * (KEYPAD_BTN_W + KEYPAD_GAP_X);
      int y = KEYPAD_START_Y + fila * (KEYPAD_BTN_H + KEYPAD_GAP_Y);
      uint16_t color = TFT_DARKGREY;
      if (String(KEYPAD_LABELS[fila][col]) == "OK") color = TFT_GREEN;
      if (String(KEYPAD_LABELS[fila][col]) == "C") color = TFT_RED;
      dibujarBoton(x, y, KEYPAD_BTN_W, KEYPAD_BTN_H, KEYPAD_LABELS[fila][col], color);
    }
  }
}

bool tocoTecladoPin(int tx, int ty, String &pinIngresado, bool &confirmado, bool &cancelado) {
  confirmado = false;
  cancelado = false;
  for (int fila = 0; fila < 4; fila++) {
    for (int col = 0; col < 3; col++) {
      int x = KEYPAD_START_X + col * (KEYPAD_BTN_W + KEYPAD_GAP_X);
      int y = KEYPAD_START_Y + fila * (KEYPAD_BTN_H + KEYPAD_GAP_Y);
      if (!dentroDeBoton(tx, ty, x, y, KEYPAD_BTN_W, KEYPAD_BTN_H)) continue;

      String label = KEYPAD_LABELS[fila][col];
      if (label == "C") {
        pinIngresado = "";
      } else if (label == "OK") {
        confirmado = true;
      } else if (pinIngresado.length() < 8) {
        pinIngresado += label;
      }
      return true;
    }
  }
  return false;
}

// ---------- Elegir slot ----------
#define SLOT_BTN_SIZE 50
void mostrarElegirSlot(int slot) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Numero de slot", ANCHO / 2, 30);

  tft.setTextSize(4);
  tft.drawString(String(slot), ANCHO / 2, 90);
  tft.setTextDatum(TL_DATUM);

  dibujarBoton(40, 65, SLOT_BTN_SIZE, SLOT_BTN_SIZE, "-", TFT_DARKGREY);
  dibujarBoton(ANCHO - 40 - SLOT_BTN_SIZE, 65, SLOT_BTN_SIZE, SLOT_BTN_SIZE, "+", TFT_DARKGREY);

  dibujarBoton(30, 160, 110, 40, "Cancelar", TFT_RED);
  dibujarBoton(180, 160, 110, 40, "Confirmar", TFT_GREEN);
}

bool tocoElegirSlot(int tx, int ty, int &slot, bool &confirmado, bool &cancelado) {
  confirmado = false;
  cancelado = false;

  if (dentroDeBoton(tx, ty, 40, 65, SLOT_BTN_SIZE, SLOT_BTN_SIZE)) {
    if (slot > 1) slot--;
    return true;
  }
  if (dentroDeBoton(tx, ty, ANCHO - 40 - SLOT_BTN_SIZE, 65, SLOT_BTN_SIZE, SLOT_BTN_SIZE)) {
    slot++;
    return true;
  }
  if (dentroDeBoton(tx, ty, 30, 160, 110, 40)) {
    cancelado = true;
    return true;
  }
  if (dentroDeBoton(tx, ty, 180, 160, 110, 40)) {
    confirmado = true;
    return true;
  }
  return false;
}

// ---------- Progreso de enrolamiento ----------
void mostrarEstadoEnrolar(const char *mensaje) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString(mensaje, ANCHO / 2, ALTO / 2);
  tft.setTextDatum(TL_DATUM);
}

void mostrarSlotGuardado(int slot) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Huella guardada", ANCHO / 2, 70);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString("Slot " + String(slot), ANCHO / 2, 110);
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Carga este numero en Fingerprint ID", ANCHO / 2, 160);
  tft.drawString("del empleado en el sistema web.", ANCHO / 2, 175);
  tft.setTextDatum(TL_DATUM);
}
