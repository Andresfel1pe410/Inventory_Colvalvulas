// Configuración del dispositivo. Edita los valores marcados con "<<<" antes
// de compilar.
#pragma once

// ---------- WiFi de la empresa ----------
#define WIFI_SSID     "MariaSanchez"      // <<< reemplaza
#define WIFI_PASSWORD "Felipe2002*"  // <<< reemplaza

// ---------- Backend ----------
// URL pública de Railway, SIN "/" al final. Ejemplo:
// https://inventario-colvalvulas.up.railway.app
#define BACKEND_URL "https://inventorycolvalvulas-production.up.railway.app"  // <<< reemplaza

// Identificador de este dispositivo físico. Con un solo sensor, déjalo en 1.
// Si algún día agregas un segundo sensor en otra puerta, dale el número 2, etc.
#define DEVICE_ID 1

// ---------- PIN de administrador para entrar al modo "Enrolar huella" ----------
#define PIN_ADMIN "1234"  // <<< cámbialo por uno propio

// ---------- Comportamiento ----------
#define INTERVALO_SYNC_MS      (30UL * 60UL * 1000UL)  // sincroniza empleados cada 30 min
#define TIEMPO_MOSTRAR_RESULTADO_MS 3000                // segundos que se ve la pantalla de resultado
#define MAX_EMPLEADOS_CACHE 200                         // tamaño del caché en memoria de fingerprint_id -> nombre

// Si más adelante quieres validar el certificado real de Railway en vez de
// aceptar cualquier TLS (setInsecure(), usado hoy por simplicidad), aquí
// iría el certificado raíz correspondiente.

// ---------- Calibración del touch XPT2046 ----------
// Casi seguro necesitas ajustar estos 4 valores para TU pantalla física.
// Cómo calibrar: sube el firmware, abre el Monitor Serie (115200 baudios),
// toca las 4 esquinas de la pantalla y anota los valores "raw x=... y=..."
// que se imprimen (ver leerToque() en pantallas.cpp) — de ahí sacas el
// mínimo y máximo real de tu unidad.
#define TOUCH_RAW_X_MIN 180
#define TOUCH_RAW_X_MAX 3800
#define TOUCH_RAW_Y_MIN 240
#define TOUCH_RAW_Y_MAX 3800
