# Encargo de la auditoría

Transcripción ordenada del pedido original (12/11/2026). Se condensaron las
listas; no se agregó ni se quitó ningún punto.

## 1. Objetivo

Auditoría integral del frontend para llevarlo a calidad profesional: que
funcione de manera excelente, sea robusto, mantenible, eficiente, visualmente
consistente y sin errores conocidos. Mentalidad crítica: que algo parezca
funcionar no lo hace correcto.

## 2. Modalidad

Dos desarrolladores en paralelo. Antes de empezar: recorrer la estructura,
identificar stack y dependencias, entender cómo se relacionan los componentes,
y detectar las zonas con más riesgo de conflicto. El trabajo se organiza en
áreas independientes; para cada una: archivos, problemas, mejoras,
dependencias y riesgo de conflicto.

**Regla fundamental:** dos personas (o agentes) no modifican a la vez los
mismos archivos. Si dos tareas tocan el mismo módulo, se define quién tiene
prioridad. Sin cambios masivos sin entender sus consecuencias.

## 3. Áreas

| | Área | Qué se busca |
|---|---|---|
| A | Arquitectura y calidad | Componentes con demasiadas responsabilidades, baja cohesión, acoplamiento, duplicación, lógica de negocio mezclada con presentación, dependencias circulares, props drilling, estado global mal administrado o duplicado, hooks sobrecargados, abstracciones innecesarias, mal manejo de errores, código e imports sin uso, convenciones inconsistentes. Sin patrones "por moda" |
| B | Bugs | Estado y sincronización, condiciones de carrera, renderizados, efectos, formularios y validaciones, datos que no se actualizan, navegación, recarga, estados vacíos, casos límite, fechas y horarios, asincronía, errores del backend y respuestas inesperadas, sesión y autenticación, secuencias de varias operaciones. Hay que **correr la app** y reproducir. Por cada bug: causa raíz, explicación, corrección, verificación, y chequeo de regresiones |
| C | Performance | Renderizados y recálculos de más, operaciones costosas por render, mal uso de `useEffect`/`useMemo`/`useCallback`, carga inicial, tamaño del bundle, dependencias de más, recursos sin optimizar, lazy loading, pedidos redundantes, memoria, listas largas, animaciones caras. Sin optimización prematura: sólo lo medible |
| D | UX/UI | Consistencia, jerarquía, espaciados, tipografía, color y contraste, tamaños, botones, formularios, tablas, modales, menús, estados de carga y vacíos, mensajes, feedback. Sin rediseñar: se respeta la identidad visual |
| E | Responsive | 320–375, 390–430, 768, 1024–1366, 1440+. Desbordes, cortes, superposiciones, tablas, modales, botones difíciles de tocar, navegación móvil, grillas, breakpoints. Que entre no alcanza: tiene que ser usable |
| F | Accesibilidad | Semántica, teclado, foco, labels, contraste, textos alternativos, ARIA, lectores de pantalla, errores y warnings de consola |
| G | Seguridad | Información sensible expuesta, tokens, `localStorage`/`sessionStorage`, contenido no confiable, dependencias vulnerables, datos del backend. No tocar autenticación sin entender el sistema entero |

## 4. Fases

1. **Diagnóstico**, sin modificar código. Informe con arquitectura, problemas,
   bugs, diseño, responsive, performance, deuda y riesgos de regresión.
   Gravedad: **CRÍTICO** (pérdida de información, fallas que impiden usar una
   función), **ALTO** (errores funcionales importantes o arquitectónicos
   significativos), **MEDIO** (usabilidad, mantenibilidad, rendimiento),
   **BAJO** (menores y visuales).
2. **Planificación.** Por tarea: problema, solución, archivos, dependencias,
   riesgo y criterio de terminado. Tareas independientes separadas.
3. **Implementación**, en este orden: bugs críticos y altos → errores
   funcionales e integridad de estado → arquitectura que estorba las
   correcciones → responsive → visual y UX → performance → menores.
4. **Testing** después de cada tanda: build, linter, tests, consola, probar lo
   modificado y los flujos principales, regresiones, responsive. Nada se marca
   resuelto sin verificar.
5. **Auditoría final**: segunda pasada completa.

## 5. Reglas obligatorias

1. No inventar problemas: cada hallazgo con evidencia.
2. No modificar código que no se entiende.
3. Sin refactorizaciones masivas sin justificación.
4. No romper contratos con el backend.
5. No cambiar funcionalidad de negocio por estética.
6. No eliminar funcionalidades para simplificar.
7. No agregar dependencias sin justificarlas.
8. No tapar errores con soluciones superficiales.
9. Buscar siempre la causa raíz.
10. Conservar convenciones y tecnologías cuando son adecuadas.
11. Lo que no se pudo verificar, se dice.
12. Documentar las modificaciones relevantes.

## 6. Entregable final

Resumen ejecutivo; cantidad de problemas por gravedad; bugs corregidos (qué
pasaba, causa, solución); mejoras de arquitectura, visuales, responsive y de
performance; tests corridos y resultados; archivos modificados; pendientes;
riesgos conocidos; recomendaciones. Sin declarar el front "libre de bugs":
se informa qué se verificó y con qué límites.

## 7. Primera etapa (la de este diagnóstico)

Sin modificar archivos: recorrer la estructura; identificar páginas,
componentes, módulos, hooks, servicios y dependencias; explicar cómo se
relacionan; identificar funcionalidades y flujos; detectar problemas
arquitectónicos y técnicos, áreas a inspeccionar a fondo y archivos sensibles.
Entregar: mapa de arquitectura, estructura de módulos, funcionalidades,
dependencias, riesgos técnicos e inventario de áreas a auditar. Y dividir el
frontend en **A. Auditoría técnica y funcional** y **B. Auditoría visual y de
experiencia de usuario**, con los archivos de cada una y los compartidos.
