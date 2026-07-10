// Mapa de pines centralizado. Ajusta aquí si tu cableado es distinto —
// ningún otro archivo debería tener un número de pin escrito directamente.
#pragma once

// ---------- Pantalla TFT (bus SPI VSPI) ----------
// TFT_eSPI NO lee estos defines: se configuran en su propio User_Setup.h
// (ver README.md). Se dejan aquí solo como referencia/documentación de lo
// que debe quedar escrito allá.
#define TFT_PIN_CLK   18
#define TFT_PIN_MOSI  23
#define TFT_PIN_MISO  19
#define TFT_PIN_CS    15
#define TFT_PIN_DC     2
#define TFT_PIN_RST    4

// ---------- Touch XPT2046 (mismo bus SPI que la TFT, CS propio) ----------
#define PIN_TOUCH_CS   21
#define PIN_TOUCH_IRQ  22

// ---------- Sensor de huella AS608 (UART2, no usa el puerto USB/Serial) ----------
#define PIN_HUELLA_RX  16  // al TX del AS608
#define PIN_HUELLA_TX  17  // al RX del AS608
