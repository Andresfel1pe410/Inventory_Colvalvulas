#include "pantallas.h"
#include "pines.h"
#include "config.h"
#include "logo.h"
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include <SPI.h>
#include <string.h>

static TFT_eSPI tft = TFT_eSPI();
static XPT2046_Touchscreen ts(PIN_TOUCH_CS, PIN_TOUCH_IRQ);

// Tu placa quedó confirmada en vertical (portrait) real: 240 de ancho x 320
// de alto, con rotación 0.
#define ANCHO 240
#define ALTO  320
#define ROTACION_PANTALLA 0

void iniciarPantalla() {
  tft.init();
  tft.setRotation(ROTACION_PANTALLA);
  tft.fillScreen(TFT_BLACK);

  ts.begin();
  ts.setRotation(ROTACION_PANTALLA);
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

#define MARGEN_TEXTO 10

// Dibuja texto centrado horizontalmente en cx. Si no cabe en maxWidth a ese
// tamaño, lo parte en varias líneas por palabra (nombres largos, mensajes
// del backend, textos del enrolamiento — nada de eso tiene longitud fija).
// Devuelve cuántas líneas ocupó, para que quien llama pueda acomodar lo que
// dibuje después sin que se encimen.
static int dibujarTextoAjustado(const String &texto, int cx, int yInicial, int size, int lineHeight) {
  tft.setTextSize(size);
  tft.setTextDatum(MC_DATUM);
  int maxWidth = ANCHO - 2 * MARGEN_TEXTO;

  if (tft.textWidth(texto) <= maxWidth) {
    tft.drawString(texto, cx, yInicial);
    tft.setTextDatum(TL_DATUM);
    return 1;
  }

  const int MAX_LINEAS = 6;
  String lineas[MAX_LINEAS];
  int numLineas = 0;
  String lineaActual = "";
  int inicio = 0;

  while (inicio <= (int)texto.length() && numLineas < MAX_LINEAS) {
    int espacio = texto.indexOf(' ', inicio);
    String palabra = (espacio == -1) ? texto.substring(inicio) : texto.substring(inicio, espacio);
    String prueba = lineaActual.length() == 0 ? palabra : (lineaActual + " " + palabra);

    if (tft.textWidth(prueba) <= maxWidth || lineaActual.length() == 0) {
      lineaActual = prueba;
    } else {
      lineas[numLineas++] = lineaActual;
      lineaActual = palabra;
    }

    if (espacio == -1) break;
    inicio = espacio + 1;
  }
  if (lineaActual.length() > 0 && numLineas < MAX_LINEAS) lineas[numLineas++] = lineaActual;

  for (int i = 0; i < numLineas; i++) {
    tft.drawString(lineas[i], cx, yInicial + i * lineHeight);
  }
  tft.setTextDatum(TL_DATUM);
  return numLineas;
}

// ---------- Pantalla de inicio ----------
// Esta pantalla (y solo esta) usa fondo blanco con texto/logo en negro —
// el resto del dispositivo (PIN, resultado, etc.) sigue con fondo negro.
void mostrarInicio() {
  tft.fillScreen(TFT_WHITE);

  // El arreglo LOGO_COLVALVULAS trae cada color en orden "lógico" (R<<11|G<<5|B),
  // pero pushImage() por defecto espera los dos bytes de cada color al revés.
  tft.setSwapBytes(true);
  tft.pushImage((ANCHO - LOGO_ANCHO) / 2, 28, LOGO_ANCHO, LOGO_ALTO, LOGO_COLVALVULAS);
  tft.setSwapBytes(false);

  tft.setTextColor(TFT_BLACK, TFT_WHITE);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(3);
  // "Control de Asistencia" no cabe en una sola línea en 240px de ancho.
  tft.drawString("Control de", ANCHO / 2, 130);
  tft.drawString("Asistencia", ANCHO / 2, 165);
  tft.setTextSize(2);
  tft.drawString("Coloque su huella", ANCHO / 2, 220);
  tft.setTextDatum(TL_DATUM);

  // Esquina para entrar a enrolar (discreta, no es la acción del día a día)
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_WHITE);
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
  if (eventType == "BREAKFAST_START") return "Inicio desayuno";
  if (eventType == "BREAKFAST_END") return "Fin desayuno";
  if (eventType == "LUNCH_START") return "Inicio almuerzo";
  if (eventType == "LUNCH_END") return "Fin almuerzo";
  if (eventType == "EXIT") return "Salida";
  return "";
}

void mostrarResultado(bool success, const String &nombre, const String &mensaje, const String &eventType,
                       float horasSemana, float horasObjetivo) {
  tft.fillScreen(TFT_BLACK);
  uint16_t color = success ? TFT_GREEN : TFT_RED;

  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(color, TFT_BLACK);
  tft.setTextSize(4);
  tft.drawString(success ? "OK" : "X", ANCHO / 2, 60);

  int y = 120;
  if (nombre.length() > 0) {
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    int lineas = dibujarTextoAjustado(nombre, ANCHO / 2, y, 2, 22);
    y += lineas * 22 + 14;
  }

  const char *etiqueta = etiquetaEvento(eventType);
  if (strlen(etiqueta) > 0) {
    tft.setTextColor(color, TFT_BLACK);
    int lineas = dibujarTextoAjustado(etiqueta, ANCHO / 2, y, 2, 22);
    y += lineas * 22 + 14;
  }

  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  int lineasMensaje = dibujarTextoAjustado(mensaje, ANCHO / 2, y, 1, 13);
  y += lineasMensaje * 13 + 16;

  if (horasObjetivo > 0) {
    String textoHoras = "Llevas " + String(horasSemana, 1) + "/" + String(horasObjetivo, 0) + " horas esta semana";
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    dibujarTextoAjustado(textoHoras, ANCHO / 2, y, 1, 13);
  }
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
#define KEYPAD_BTN_W 64
#define KEYPAD_BTN_H 42
#define KEYPAD_GAP_X 8
#define KEYPAD_GAP_Y 10
#define KEYPAD_START_X ((ANCHO - (3 * KEYPAD_BTN_W + 2 * KEYPAD_GAP_X)) / 2)
#define KEYPAD_START_Y 110

void mostrarTecladoPin(const String &pinIngresado) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Ingrese el PIN", ANCHO / 2, 30);

  String mascara = "";
  for (unsigned int i = 0; i < pinIngresado.length(); i++) mascara += "*";
  tft.setTextSize(3);
  tft.drawString(mascara, ANCHO / 2, 65);
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

void actualizarMascaraPin(const String &pinIngresado) {
  tft.fillRect(0, 45, ANCHO, 40, TFT_BLACK);
  String mascara = "";
  for (unsigned int i = 0; i < pinIngresado.length(); i++) mascara += "*";
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString(mascara, ANCHO / 2, 65);
  tft.setTextDatum(TL_DATUM);
}

// Toque genérico sobre la grilla 4x3. Si cayó en un botón devuelve su label
// por referencia y true; si no, false. No decide qué significa el label —
// eso lo hace cada pantalla que la usa (PIN enmascara, slot no).
static bool tocoGridTeclado(int tx, int ty, String &label) {
  for (int fila = 0; fila < 4; fila++) {
    for (int col = 0; col < 3; col++) {
      int x = KEYPAD_START_X + col * (KEYPAD_BTN_W + KEYPAD_GAP_X);
      int y = KEYPAD_START_Y + fila * (KEYPAD_BTN_H + KEYPAD_GAP_Y);
      if (!dentroDeBoton(tx, ty, x, y, KEYPAD_BTN_W, KEYPAD_BTN_H)) continue;
      label = KEYPAD_LABELS[fila][col];
      return true;
    }
  }
  return false;
}

static void dibujarGridTeclado() {
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
  String label;
  if (!tocoGridTeclado(tx, ty, label)) return false;

  if (label == "C") {
    pinIngresado = "";
  } else if (label == "OK") {
    confirmado = true;
  } else if (pinIngresado.length() < 8) {
    pinIngresado += label;
  }
  return true;
}

// ---------- Elegir slot (teclado numérico) ----------
#define SLOT_CANCELAR_X 0
#define SLOT_CANCELAR_Y 0
#define SLOT_CANCELAR_W 65
#define SLOT_CANCELAR_H 24

void mostrarTecladoSlot(const String &slotIngresado) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Numero de slot", ANCHO / 2, 30);

  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Cancelar", SLOT_CANCELAR_W / 2, 12);

  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString(slotIngresado, ANCHO / 2, 65);
  tft.setTextDatum(TL_DATUM);

  dibujarGridTeclado();
}

void actualizarValorSlot(const String &slotIngresado) {
  tft.fillRect(0, 45, ANCHO, 40, TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString(slotIngresado, ANCHO / 2, 65);
  tft.setTextDatum(TL_DATUM);
}

bool tocoTecladoSlot(int tx, int ty, String &slotIngresado, bool &confirmado, bool &cancelado) {
  confirmado = false;
  cancelado = false;

  if (dentroDeBoton(tx, ty, SLOT_CANCELAR_X, SLOT_CANCELAR_Y, SLOT_CANCELAR_W, SLOT_CANCELAR_H)) {
    cancelado = true;
    return true;
  }

  String label;
  if (!tocoGridTeclado(tx, ty, label)) return false;

  if (label == "C") {
    slotIngresado = "";
  } else if (label == "OK") {
    confirmado = true;
  } else if (slotIngresado.length() < 3) {
    slotIngresado += label;
  }
  return true;
}

// ---------- Progreso de enrolamiento ----------
void mostrarEstadoEnrolar(const char *mensaje) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  dibujarTextoAjustado(String(mensaje), ANCHO / 2, ALTO / 2 - 22, 2, 24);
}

void mostrarSlotGuardado(int slot) {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("Huella guardada", ANCHO / 2, 90);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(3);
  tft.drawString("Slot " + String(slot), ANCHO / 2, 140);
  tft.setTextSize(1);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Carga este numero en", ANCHO / 2, 200);
  tft.drawString("Fingerprint ID del empleado", ANCHO / 2, 215);
  tft.drawString("en el sistema web.", ANCHO / 2, 230);
  tft.setTextDatum(TL_DATUM);
}
