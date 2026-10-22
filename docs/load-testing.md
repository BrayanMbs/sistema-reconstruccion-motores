# Guía de Pruebas de Carga y Resiliencia con k6

Este documento define la política, perfil de carga autorizado y directrices de seguridad para la ejecución de pruebas de carga contra el **Sistema de Reconstrucción de Motores**.

---

## 1. Legitimidad de k6 y Filosofía de Protección

* **k6 es una herramienta legítima**: k6 es utilizado para validar el rendimiento, latencia (p95/p99) y estabilidad del sistema bajo concurrencia controlada.
* **Sin bloqueo por firma**: El sistema **NO** bloquea ni discrimina peticiones basándose en la cabecera `User-Agent: k6/*` ni por firmas sintéticas.
* **Protección ante abuso real**: Las defensas implementadas (Rate Limiting, límites de tamaño de cuerpo, timeouts y bloqueo temporal por IP) protegen la disponibilidad del servidor ante tráfico abusivo o no controlado, independientemente de la herramienta emisora.

---

## 2. Política de Ejecución Segura

> [!CAUTION]
> **PROHIBIDO EJECUTAR CONTRA PRODUCCIÓN O TERCEROS**:
> Las pruebas de carga deben ejecutarse **exclusivamente** contra entornos locales o de *staging* previamente aprovisionados. Nunca deben dirigirse contra producción ni provocar llamadas masivas a servicios de terceros (como el backend de Supabase Auth en la nube), evitando cargos inesperados o el bloqueo de cuotas del proyecto.

---

## 3. Perfil de Carga Autorizado para Staging

Para verificar la capacidad del servidor sin saturar los recursos ni activar mitigaciones de emergencia:

### Parámetros del Perfil Seguro
* **Usuarios Virtuales (VUs)**: 1 a 10 VUs concurrentes.
* **Tasa esperada**: 20 a 50 peticiones por segundo (RPS).
* **Duración total**: ~2 minutos (30s subida, 60s sostenido, 30s bajada).
* **Endpoints objetivo**:
  - `GET /health` (Liveness)
  - `GET /api/health` (Readiness)
  - `POST /api/public/orders/tracking` (Consulta pública con validación sintáctica)

### Objetivos de Nivel de Servicio (SLO)
* **Tasa de error**: `< 1%` de fallos HTTP (código 5xx).
* **Latencia p95**: `< 500 ms`.
* **Latencia p99**: `< 1000 ms`.

---

## 4. Configuración para Ejecución de Pruebas

Durante pruebas de carga autorizadas en *staging*, configure las variables de entorno en el backend según el objetivo de la prueba:

| Variable | Valor Estándar | Valor durante Benchmark Ampliado |
|---|---|---|
| `RATE_LIMIT_ENABLED` | `true` | `true` (o `false` si se evalúa capacidad bruta del hardware) |
| `API_RATE_LIMIT_MAX` | `600` | `2000` |
| `PUBLIC_TRACKING_RATE_LIMIT_MAX` | `60` | `500` |
| `TRUST_PROXY` | `1` (detrás de ingress/load balancer) | `1` |

---

## 5. Ejecución del Script Automatizado

El repositorio incluye un script oficial de prueba en `scripts/k6-load-test.js`.

### Requisitos previos
* Tener [k6 instalado](https://k6.io/docs/get-started/installation/).
* Backend ejecutándose en local (`http://localhost:8080`) o staging.

### Comando de ejecución
```bash
# Ejecución básica contra entorno local
k6 run scripts/k6-load-test.js

# Ejecución especificando URL base
k6 run -e TARGET_URL=http://localhost:8080 scripts/k6-load-test.js
```

