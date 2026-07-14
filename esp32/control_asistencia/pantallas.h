// Dibujo de pantallas (TFT_eSPI) y lectura de touch (XPT2046_Touchscreen).
// Pantalla en portrait: 240x320.
#pragma once
#include <Arduino.h>

void iniciarPantalla();

// Lee un toque, si lo hay. Devuelve false si no se tocó nada. Coordenadas ya
// mapeadas a píxeles de pantalla (0..239, 0..319) usando la calibración de
// config.h. Imprime el valor crudo por Serial (útil para calibrar).
bool leerToque(int &tx, int &ty);

// ---------- Pantalla de inicio ----------
void mostrarInicio();
// Esquina superior derecha, pequeña, para entrar a "Enrolar" sin que estorbe
// el uso diario.
bool tocoEsquinaEnrolar(int tx, int ty);

// ---------- Resultado de una marcación ----------
void mostrarProcesando();
// horasSemana/horasObjetivo son opcionales: si horasObjetivo <= 0 no se
// muestra la línea de horas (caso de huella no reconocida, sin empleado).
void mostrarResultado(bool success, const String &nombre, const String &mensaje, const String &eventType,
                       float horasSemana = -1, float horasObjetivo = -1);

// ---------- Sin conexión ----------
void mostrarSinWifi();

// ---------- PIN de administrador ----------
void mostrarTecladoPin(const String &pinIngresado);
// Repinta solo el asterisco del PIN (no el teclado completo) — úsala en cada
// tecla presionada en vez de volver a llamar mostrarTecladoPin().
void actualizarMascaraPin(const String &pinIngresado);
// Interpreta un toque sobre el teclado numérico. Si se tocó un dígito, lo
// agrega a pinIngresado; si se tocó "C" lo limpia; si se tocó "OK" pone
// confirmado=true. Devuelve true si el toque cayó en algún botón del teclado.
bool tocoTecladoPin(int tx, int ty, String &pinIngresado, bool &confirmado, bool &cancelado);

// ---------- Elegir slot para enrolar (teclado numérico) ----------
void mostrarTecladoSlot(const String &slotIngresado);
// Repinta solo el valor (no el teclado completo) — úsala en cada tecla.
void actualizarValorSlot(const String &slotIngresado);
// Toque en "Cancelar" (esquina) pone cancelado=true. Dígitos se acumulan
// hasta 3 caracteres; "C" limpia; "OK" pone confirmado=true.
bool tocoTecladoSlot(int tx, int ty, String &slotIngresado, bool &confirmado, bool &cancelado);

// ---------- Progreso de enrolamiento ----------
void mostrarEstadoEnrolar(const char *mensaje);
void mostrarSlotGuardado(int slot);
