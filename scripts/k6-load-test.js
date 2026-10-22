import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Escenario de pruebas de carga autorizado para Staging / Local.
 * Sistema de Reconstrucción de Motores.
 *
 * Directrices:
 * - NO ejecutar contra producción ni servicios de terceros.
 * - k6 no es bloqueado por firma; respeta los límites de tasa configurados.
 */

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Rampa de subida gradual a 5 usuarios virtuales
    { duration: '1m',  target: 10 }, // Carga sostenida a 10 usuarios virtuales
    { duration: '20s', target: 0 },  // Rampa de bajada limpia
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% de peticiones bajo 500ms
    http_req_failed: ['rate<0.01'],                 // Tasa de error menor al 1%
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-runner/1.0 (Staging Verification; +https://k6.io)',
    },
  };

  // 1. Health Liveness (ligero, sin persistencia)
  const livenessRes = http.get(`${TARGET_URL}/health`, params);
  check(livenessRes, {
    'liveness status 200': (r) => r.status === 200,
    'liveness status UP': (r) => {
      try {
        return JSON.parse(r.body).status === 'UP';
      } catch {
        return false;
      }
    },
  });

  // 2. Health Readiness (verifica estado de base de datos)
  const readinessRes = http.get(`${TARGET_URL}/api/health`, params);
  check(readinessRes, {
    'readiness status 200': (r) => r.status === 200,
  });

  // 3. Consulta de seguimiento público sintética (valida rate limiting y headers)
  const trackingPayload = JSON.stringify({
    orderNumber: 'OT-2026-00001',
    trackingCode: 'MTR-000000000000000000000000',
  });

  const trackingRes = http.post(`${TARGET_URL}/api/public/orders/tracking`, trackingPayload, params);
  check(trackingRes, {
    'public tracking responds with 200, 404, or 429': (r) =>
      r.status === 200 || r.status === 404 || r.status === 429,
    'rate limit headers present': (r) =>
      r.headers['Ratelimit-Limit'] !== undefined || r.headers['ratelimit-limit'] !== undefined,
  });

  sleep(1);
}

