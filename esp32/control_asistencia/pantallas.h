// Dibujo de pantallas (TFT_eSPI) y lectura de touch (XPT2046_Touchscreen).
// Pantalla en landscape: 320x240.
#pragma once
#include <Arduino.h>

void iniciarPantalla();

// Lee un toque, si lo hay. Devuelve false si no se tocó nada. Coordenadas ya
// mapeadas a píxeles de pantalla (0..319, 0..239) usando la calibración de
// config.h. Imprime el valor crudo por Serial (útil para calibrar).
bool leerToque(int &tx, int &ty);

// ---------- Pantalla de inicio ----------
void mostrarInicio();
// Esquina superior derecha, pequeña, para entrar a "Enrolar" sin que estorbe
// el uso diario.
bool tocoEsquinaEnrolar(int tx, int ty);

// ---------- Resultado de una marcación ----------
void mostrarProcesando();
void mostrarResultado(bool success, const String &nombre, const String &mensaje, const String &eventType);

// ---------- Sin conexión ----------
void mostrarSinWifi();

// ---------- PIN de administrador ----------
void mostrarTecladoPin(const String &pinIngresado);
// Interpreta un toque sobre el teclado numérico. Si se tocó un dígito, lo
// agrega a pinIngresado; si se tocó "C" lo limpia; si se tocó "OK" pone
// confirmado=true. Devuelve true si el toque cayó en algún botón del teclado.
bool tocoTecladoPin(int tx, int ty, String &pinIngresado, bool &confirmado, bool &cancelado);

// ---------- Elegir slot para enrolar ----------
void mostrarElegirSlot(int slot);
bool tocoElegirSlot(int tx, int ty, int &slot, bool &confirmado, bool &cancelado);

// ---------- Progreso de enrolamiento ----------
void mostrarEstadoEnrolar(const char *mensaje);
void mostrarSlotGuardado(int slot);
