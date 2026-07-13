# Firmware ESP32 — Control de Asistencia Biométrico

Firmware para Arduino IDE que conecta el sensor de huella AS608 y una
pantalla TFT táctil 2.8" (240x320, ILI9341 + touch XPT2046) al backend del
ERP (`/api/v1/device/event` y `/api/v1/device/employees`).

## 1. Instalar soporte de ESP32 en Arduino IDE

`Archivo → Preferencias → URLs adicionales de gestor de tarjetas`, pega:

```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

Luego `Herramientas → Placa → Gestor de tarjetas`, busca "esp32" (por
Espressif Systems) e instálalo.

## 2. Instalar librerías (Gestor de Librerías — `Herramientas → Administrar Bibliotecas`)

Busca e instala cada una **por su nombre exacto**:

| Librería | Autor |
|---|---|
| `Adafruit Fingerprint Sensor Library` | Adafruit |
| `TFT_eSPI` | Bodmer |
| `XPT2046_Touchscreen` | Paul Stoffregen |
| `ArduinoJson` | Benoit Blanchon (versión 7.x) |

## 3. Configurar TFT_eSPI (paso obligatorio, no es opcional)

`TFT_eSPI` **no** recibe los pines desde el sketch — se configuran editando
un archivo dentro de la propia librería. Ubícalo en:

```
Documentos\Arduino\libraries\TFT_eSPI\User_Setup.h
```

Ábrelo y reemplaza su contenido por esto (o agrégalo al inicio, comentando
cualquier `#define ..._DRIVER` que ya exista):

```cpp
#define ILI9341_DRIVER

#define TFT_MISO 19
#define TFT_MOSI 23
#define TFT_SCLK 18
#define TFT_CS   15
#define TFT_DC    2
#define TFT_RST   4

#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_FONT6
#define LOAD_FONT7
#define LOAD_FONT8
#define LOAD_GFXFF
#define SMOOTH_FONT

#define SPI_FREQUENCY       40000000
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY 2500000
```

(El touch lo maneja `XPT2046_Touchscreen` por separado, con su propio CS/IRQ
definidos en `pines.h` — no hace falta agregar `TOUCH_CS` aquí.)

## 4. Cableado (según `pines.h`)

```
TFT (pantalla)          ESP32
  VCC, LED   ----------- 3.3V
  GND        ----------- GND
  CLK/SCK    ----------- GPIO 18
  MOSI/SDI   ----------- GPIO 23
  MISO/SDO   ----------- GPIO 19
  CS         ----------- GPIO 15
  DC/RS      ----------- GPIO 2
  RST        ----------- GPIO 4

Touch XPT2046 (suele compartir el mismo módulo que la TFT)
  T_CLK/T_MOSI/T_MISO -- mismos pines que arriba (bus compartido)
  T_CS       ----------- GPIO 21
  T_IRQ      ----------- GPIO 22

AS608 (sensor de huella)
  VCC        ----------- 3.3V o 5V (revisa el datasheet de tu módulo)
  GND        ----------- GND
  TX         ----------- GPIO 25
  RX         ----------- GPIO 26
```

**Nota sobre GPIO16/17:** si tu ESP32 es un módulo WROVER (con PSRAM), esos dos
pines están reservados internamente para la memoria externa y no funcionan
como GPIO normal — por eso el sensor se conecta en 25/26 en vez de 16/17.

Verifica esto contra el silkscreen real de tus módulos antes de alimentar —
esta es una asignación estándar, no viene de tu montaje.

## 5. Editar `config.h`

Reemplaza `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL` y `PIN_ADMIN` por los
tuyos. `BACKEND_URL` es la URL pública de tu backend en Railway, sin `/` al
final (ej. `https://inventario-colvalvulas.up.railway.app`).

## 6. Compilar y subir

`Herramientas → Placa`: elige tu modelo exacto de ESP32 (si no sabes cuál,
"ESP32 Dev Module" funciona para la gran mayoría de placas genéricas).
Selecciona el puerto COM correspondiente y sube (botón →).

## 7. Calibrar el touch (necesario la primera vez)

Abre el Monitor Serie (115200 baudios). Toca varias veces las 4 esquinas de
la pantalla — vas a ver líneas como:

```
touch raw x=312 y=3721
```

Anota los valores mínimo y máximo de X y Y que veas, y ajústalos en
`config.h`:

```cpp
#define TOUCH_RAW_X_MIN ...
#define TOUCH_RAW_X_MAX ...
#define TOUCH_RAW_Y_MIN ...
#define TOUCH_RAW_Y_MAX ...
```

Vuelve a subir el firmware. Si los botones en pantalla responden donde los
tocas, quedó bien calibrado.

## 8. Primer uso

1. Enciende el dispositivo — debería conectarse al WiFi y mostrar
   "Coloque su huella".
2. Toca "Enrolar" (esquina superior derecha) → ingresa el PIN de `config.h`
   → confirma o ajusta el número de slot con `-`/`+` → "Confirmar".
3. Sigue las instrucciones en pantalla (coloca el dedo dos veces).
4. Al terminar, la pantalla muestra el número de slot — anótalo.
5. En el sistema web, crea o edita ese empleado y pon ese mismo número en
   **Fingerprint ID**.
6. Pide a esa persona que ponga el dedo en el sensor desde la pantalla de
   inicio — debería ver su nombre y "Entrada" en pantalla, y el evento debe
   aparecer en **Recursos Humanos → Reporte** en el sistema web.

## Notas
- El dispositivo no requiere login: los dos endpoints que usa
  (`/device/event`, `/device/employees`) son públicos a propósito.
- Si pierdes conexión WiFi, la pantalla lo indica y reintenta solo cada 10s.
- El PIN de enrolamiento vive en texto plano en `config.h` — es una barrera
  simple contra que cualquiera enrole huellas, no un mecanismo de seguridad
  fuerte. Si se pierde/roba el dispositivo, cambia el PIN y vuelve a subir
  el firmware.
