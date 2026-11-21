// Evaluación del asistente de ayuda (demo, F5).
//
// Corre las preguntas de `preguntas.json` contra un backend levantado, de a una
// y con pausa para no pasar el cupo por usuario (6 por minuto), y guarda las
// respuestas con los chequeos automáticos. Los chequeos son una primera pasada:
// cada respuesta se lee igual.
//
// Uso (desde la raíz del repo):
//   node docs/experimental/asistente/evaluacion/evaluar.mjs <backend/.env> <salida.json> [http://localhost:3001]
//   EVAL_IDS=P13,P15 node … (sólo esas preguntas)
//
// Inicia sesión con DEV_SEED_USERNAME / DEV_SEED_PASSWORD del .env que se le pasa
// (el usuario de prueba de desarrollo). No imprime credenciales.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [envPath, outPath, base = 'http://localhost:3001'] = process.argv.slice(2);
if (!envPath || !outPath) {
  console.error('Uso: node evaluar.mjs <backend/.env> <salida.json> [baseUrl]');
  process.exit(1);
}

const PAUSE_MS = 11_000;
const here = dirname(fileURLToPath(import.meta.url));
// `EVAL_IDS=P13,P15` corre sólo esas preguntas (para no gastar cupo de más).
const only = process.env.EVAL_IDS?.split(',').map((id) => id.trim());
const preguntas = JSON.parse(readFileSync(join(here, 'preguntas.json'), 'utf8')).preguntas.filter(
  (q) => !only || only.includes(q.id),
);
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
const api = `${base}/api/v1`;

const login = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: env.DEV_SEED_USERNAME, password: env.DEV_SEED_PASSWORD }),
});
const token = (await login.json()).data?.accessToken;
if (!token) {
  console.error(`No se pudo iniciar sesión (HTTP ${login.status}).`);
  process.exit(1);
}

const matches = (pattern, text) => new RegExp(pattern, 'i').test(text);
const results = [];

for (const [index, q] of preguntas.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

  const started = Date.now();
  const res = await fetch(`${api}/help/assistant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: q.pregunta }] }),
  });
  const ms = Date.now() - started;
  const body = await res.json();
  const answer = body.data?.answer ?? '';
  const sources = (body.data?.sources ?? []).map((s) => s.id);

  const checks = {
    status: res.status === 200,
    fuentes: sources.every((id) => q.fuentes.includes(id)),
    debeMencionar: q.debeMencionar.filter((p) => !matches(p, answer)),
    noDebe: q.noDebe.filter((p) => matches(p, answer)),
  };
  const ok = checks.status && checks.fuentes && !checks.debeMencionar.length && !checks.noDebe.length;
  results.push({ ...q, status: res.status, ms, answer, sources, error: body.error ?? null, checks, ok });

  console.log(
    `${q.id} ${ok ? 'OK ' : 'REVISAR'} ${res.status} ${ms}ms fuentes=[${sources.join(', ')}]` +
      (checks.fuentes ? '' : ' (fuera de lo esperado)') +
      (checks.debeMencionar.length ? ` falta=${JSON.stringify(checks.debeMencionar)}` : '') +
      (checks.noDebe.length ? ` sobra=${JSON.stringify(checks.noDebe)}` : ''),
  );
}

writeFileSync(outPath, JSON.stringify({ fecha: new Date().toISOString(), base, results }, null, 2));
const passed = results.filter((r) => r.ok).length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(
  `\n${passed}/${results.length} pasan los chequeos automáticos. ` +
    `Latencia: mediana ${times[Math.floor(times.length / 2)]} ms, máxima ${times[times.length - 1]} ms.`,
);
