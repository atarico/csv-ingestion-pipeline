<!-- Borrador en primera persona generado a partir de los hechos del proceso. Validar cada frase antes de enviar. -->

# Uso de Inteligencia Artificial en esta Prueba

## Herramientas utilizadas
- [x] Claude Code
- [ ] GitHub Copilot
- [ ] ChatGPT
- [ ] Cursor AI
- [ ] Otra: ________

## Cómo se trabajó

Trabajé en tres fases con Claude Code. En una sesión de planificación (2026-10-09)
revisamos el documento de la prueba técnica, detectamos las inconsistencias que figuran en
el README en "Decisiones ante ambigüedades del enunciado" (por ejemplo, la cola en memoria
que no puede compartirse entre procesos, el estado `PROCESSING` que nunca se asignaba o el
orden entre encolar y crear el registro) y se produjo una especificación por capas (diez
documentos, de cimientos a entregables) con versiones fijadas y criterios de aceptación.

En la segunda fase, Claude Code implementó el código capa por capa a partir de esa
especificación. El agente principal (modelo Opus 5.5) delegó cada capa en sub-agentes
(modelo Sonnet), que escribieron primero las pruebas y las vieron fallar, implementaron
hasta que pasaran y ejecutaron `lint`, `typecheck` y las pruebas antes de cada commit. Se
usó una rama por capa (`feat/01-foundations` a `docs/10-deliverables`), unida a `main` con
`git merge --no-ff`, y commits convencionales atómicos. Después de cada commit, la
herramienta de orquestación ejecutó una revisión de código automática, con mi
consentimiento (en la ronda de correcciones concedí todos los avisos). Sus hallazgos
no bloqueantes que no se corrigieron están en el README, en "Limitaciones conocidas".
Además de este documento, recibí un informe didáctico por capa (fuera del repositorio).

En la tercera fase pedí una revisión independiente del resultado, hecha con cuatro
revisores de código, una evaluación con rúbrica y un verificador que ejecutó cada
comprobación; produjo `informes/11-revision-completa.md` (fuera del repositorio). A partir
de ese informe solicité una ronda de correcciones, que Claude Code aplicó en la rama
`fix/12-review-followups` con un commit por tarea, pruebas primero y una revisión
automática después de cada commit.

## Qué se generó con IA

### Backend
- [x] Estructura del repositorio, configuración de TypeScript, ESLint, Prettier y Vitest
- [x] Schema de Prisma 7, migración inicial y configuración con Convict
- [x] Núcleo compartido: `Either`, errores de dominio, entidad base, puertos
- [x] Modelo de dominio: agregado `Upload`, value objects y repositorios
- [x] Parser CSV (`csv-parse` detrás de `ICsvParser`) y política de cabecera
- [x] Commands, queries y handlers con sus DTOs
- [x] Adaptadores: repositorios Prisma, S3, SQS y contenedor de Awilix
- [x] API REST con Fastify y manejo de errores centralizado
- [x] Worker con reintentos con backoff, DLQ y apagado ordenado
- [x] Pruebas unitarias y de integración (220 en el backend tras la ronda de correcciones)

### Frontend
- [x] Scaffold de Next.js 16 con React Query, axios y Tailwind 4
- [x] Dashboard, listado, formulario de subida y detalle con polling cada 3 s
- [x] Componentes, hooks y pruebas (44 en el frontend tras la ronda de correcciones)

### Infraestructura y documentación
- [x] Docker Compose con PostgreSQL y LocalStack, y script de inicialización de AWS
- [x] Dockerfiles y perfil `app` de Compose
- [x] Capa E2E: paquete `e2e/` con cuatro pruebas de navegador (Playwright, Chromium) contra el stack de Compose, y un job `e2e` en el workflow de CI
- [x] Workflow de CI de GitHub Actions (no ejecutado en GitHub, ver más abajo)
- [x] Ronda de correcciones tras la revisión independiente (ver la sección siguiente)
- [x] Diagramas de flujo y de arquitectura AWS (Mermaid y PNG)
- [x] Archivos CSV de ejemplo y el generador del archivo grande
- [x] README, este documento y los informes por capa (estos últimos, fuera del repositorio)

## Qué se modificó o corrigió durante la implementación

Ajustes concretos que se hicieron porque la especificación o una librería se comportaba de
otra forma:

- `docker-compose.yml`: la imagen `postgres:18-alpine` termina con error si el volumen se
  monta en `/var/lib/postgresql/data` (lo que indicaba la especificación); se montó en
  `/var/lib/postgresql`.
- Los tests unitarios de Vitest también recogían los `*.integration.test.ts`; el proyecto
  `unit` ahora los excluye.
- `rowErrors` se tipó como `Prisma.InputJsonArray` para el cliente de Prisma 7.
- `Amount.toString()` necesitó `override` por `noImplicitOverride`.
- La especificación daba un ejemplo de `toStorageKeySegment("mi archivo ñ.csv")` que
  contradecía su propia regla; la prueba usa la salida correcta (`mi_archivo__.csv`).
- Se añadió la exclusión de `coverage/**` en ESLint al incorporar la cobertura en la capa 09.
- Se eliminaron del scaffold de Next.js las opciones que activa `create-next-app@16.4.0 --yes`
  y no se podían declinar de forma no interactiva (`cacheComponents`,
  `partialPrefetching` y un loader de `@tailwindcss/turbopack`); Tailwind se fijó en 4.3.3
  mediante PostCSS. Se quitó la fuente de Google (Geist) para que el build funcione sin red.
- Dockerfile del frontend: se quitó la copia de `public/` (la carpeta no existe).
- El comando de exportación del PNG de la especificación usa `-w 1600`, opción que ya no
  existe en la imagen actual de `mermaid-cli`; se usó `-s 2` (escala) y el PNG se generó con
  la imagen `minlag/mermaid-cli`.
- Se añadió `AGENTS.md` a `frontend/.gitignore`: `next dev` (16.4) lo genera.

Tras la revisión independiente, Claude Code aplicó estas correcciones (commits `05f231c` a
`95b1f55`), cada una con su prueba escrita antes:

- B1: el parser de CSV destruye el stream de origen cuando se detiene antes de tiempo.
- B2: el formulario ignora los archivos soltados mientras hay una subida en curso y reinicia
  el campo de archivo, de modo que se puede elegir el mismo archivo dos veces.
- B3: el long polling y la espera del backoff del worker se cancelan al apagar;
  `docker compose stop worker` pasó a tardar 0,3 s (código 0) y se añadió
  `stop_grace_period`.
- B4: healthchecks de preparación para LocalStack (init y ready), la API y el frontend.
- B5: la imagen de Docker del backend se construye sin archivos de entorno.
- B6: el repositorio en memoria de las pruebas guarda copias, por lo que las pruebas
  comprueban la persistencia de verdad.
- B7: las claves de AWS son opcionales; sin ellas se usa la cadena de credenciales por
  defecto.
- B8: pruebas de las ramas de fallo (segunda descarga fallida y fallos del parser).
- B9: los value objects de texto rechazan caracteres de control.
- B10: la paginación tiene desempate determinista (`createdAt` y `id`, descendentes).
- Lote menor: límites y nombre de campo del multipart, tope del parámetro `page`, validación
  del `x-request-id`, mensaje de cabecera `unexpected [""]`, fijación de `@prisma/adapter-pg`,
  ajuste de `page` y mensaje de página inexistente en el frontend, sin reintentos ante 4xx,
  regiones en vivo en los badges y `HOSTNAME`/`PORT` en el Dockerfile.
- Documentación: `NODE_ENV=development` en `backend/.env.example`, README en lenguaje de
  producto con las limitaciones actualizadas y este documento.

## Qué aprendí
<!-- TODO (candidato): completar con tu experiencia real -->

## Limitaciones encontradas con IA

Cosas que exigieron consultar documentación, comprobaciones que fallaron y cómo se
resolvieron:

- `@types/convict@6.2.5` no está publicado; la versión más reciente es 6.1.6 y se fijó esa
  (`convict` sigue en 6.2.5).
- `npm i dotenv` sin versión resuelve la 18.x, fuera del rango de la especificación; se
  instaló `dotenv@17` (17.4.2).
- En el segundo commit de la capa 01 no había pruebas todavía y `vitest run` sale con
  código 1 sin pruebas; se resolvió al añadir las pruebas en el commit siguiente.
- LocalStack 4.14.0 devuelve las URLs de las colas con el host `localhost.localstack.cloud`;
  los archivos de entorno mantienen `localhost:4566`, que funciona desde el host.
- `prettier --check` marcaba dos archivos copiados literalmente de la especificación
  (`eslint.config.js`, `tsconfig.build.json`); se revisó en la capa de CI.
- `backend/eslint.config.js` (literal de la especificación) no ignoraba `coverage/**` y un
  directorio de cobertura sobrante rompía `npm run lint`; se corrigió en la capa 09.
- Reglas de ESLint (`require-await`, sin excepción para parámetros con guion bajo) obligan a
  que los dobles de prueba devuelvan `Promise.resolve/reject` y omitan parámetros no usados.
- `npm run worker` informa código de salida 130 al interrumpir el grupo de procesos aunque
  el proceso de node termina con 0.
- `create-next-app@16.4.0 --yes` activa opciones sin forma no interactiva de declinarlas
  (ver arriba) y el scaffold ignora `.env*`, por lo que hubo que añadir excepciones para
  `.env.example` y `.env.development`.
- El primer commit del frontend no tiene pruebas, por lo que se usó `passWithNoTests`
  temporalmente (se quitó en el commit siguiente).
- `docker compose --profile app down` también elimina PostgreSQL y LocalStack; se detuvo
  la infraestructura sin querer durante la verificación y se volvió a levantar con
  `docker compose up -d --wait` (los volúmenes se conservan).
- La API no registra una línea `Server listening at http://0.0.0.0:4000`, sino una por
  interfaz de red; el criterio de la lista de humo se interpretó como "la API escucha en el
  puerto 4000".
- Ctrl+C al worker durante el long polling tardó unos 21 s, algo por encima de los 20 s que
  fija la lista de humo (corregido después: ver B3).
- En la prueba de la DLQ, el upload pasa a `FAILED` en el momento del tercer intento, pero
  el mensaje solo aparece en `file-processing-dlq` unos 60 s después (cuando vence el
  visibility timeout de la tercera recepción).
- La imagen `minlag/mermaid-cli` más reciente rechaza la opción `-w` del comando de la
  especificación; el diagrama de arquitectura en dirección `LR` salía demasiado ancho para
  leerse y se pasó a `TB`.
- Los hallazgos no bloqueantes de las revisiones automáticas que no se corrigieron están
  en el README, en "Limitaciones conocidas".
- El workflow de CI no se ha ejecutado en GitHub (el repositorio no tiene remoto): se
  validó con `actionlint` y reproduciendo cada job en local. Las versiones `@v7` de las
  actions no se pudieron comprobar.

### Lista de humo manual (ejecutada una vez, en la capa 10)

| Paso | Cómo se comprobó | Resultado |
|------|------------------|-----------|
| 1. `docker compose up -d` | Línea de comandos | `postgres` y `localstack` healthy; `awslocal sqs list-queues` lista 3 colas |
| 2. API (`npm run dev`) | Log | La API escucha en el puerto 4000 (ver nota sobre la línea de log) |
| 3. Worker (`npm run worker`) | Log | `Worker started` con la URL de la cola |
| 4. Frontend (`npm run dev`) | Chromium headless con `playwright-core` | El dashboard se renderiza; los totales no eran cero porque la base de desarrollo ya tenía uploads de pruebas anteriores |
| 5. Subir `sample-data.csv` | Chromium headless | `Completado`, 60 filas en una página; log `Upload processed` con `processedRows: 60` |
| 5b. Archivo grande | Chromium headless | `Procesando X de 50000 filas` observado (11 500, 26 500, 40 500), consulta cada 3 s, luego `Completado` con 50 000 filas |
| 6. `sample-with-errors.csv` | Chromium headless | `Completado`, `Filas con errores: 6`, tabla con las filas 3, 7, 11, 15, 19 y 23 (la 23 con dos errores) |
| 7. `invalid-header.csv` | Chromium headless | `Fallido`, `Invalid CSV header: missing [date]` |
| 8. Ruta DLQ | curl, `awslocal` y log del worker | Reintentos a 16 s y 32 s, `Message dead-lettered`, upload `FAILED` y mensaje en la DLQ |
| 9. Detener LocalStack | Log del worker y un upload nuevo | `Receive failed, backing off` con `delayMs` creciente; tras reiniciar procesó sin reiniciar el worker |
| 10. Ctrl+C al worker | Señal SIGINT al grupo de procesos | `Shutting down worker` y salida en unos 21 s |

No se midió el criterio "el listado y el dashboard se refrescan en menos de 5 s" del paso 5b
con un cronómetro; solo se comprobó que el polling del detalle ocurre cada 3 s.

### Lista de aceptación previa a la entrega (ejecutada una vez, en la capa 10)

| Comprobación | Cómo se comprobó | Resultado |
|--------------|------------------|-----------|
| Clon limpio (`git clone` del repositorio local) siguiendo la opción A del README | Comandos del README, Chromium headless con `playwright-core` | `docker compose up -d`, `npm ci`, `prisma:migrate`, `prisma:generate`, API, worker y frontend funcionan; con la base nueva el dashboard muestra 0; `sample-data.csv` queda `Completado` con 60 filas en una página |
| `large-sample.csv` | Chromium headless | `Procesando` con la barra avanzando (13 500, 26 500 y 41 000 filas), luego `Completado` con `processedRows 50000`; el polling se detiene al terminar |
| `sample-with-errors.csv` | Chromium headless | `Completado`, `failedRows 6`, tabla con las filas 3, 7, 11, 15, 19 y 23 |
| `invalid-header.csv` | Chromium headless | `Fallido`, `Invalid CSV header: missing [date]` |
| `docker compose --profile app up --build` en el clon | curl y Chromium headless | `/health` devuelve `{"status":"ok"}`, el frontend responde y el flujo completo (muestra, errores, cabecera inválida y archivo grande) funciona contra los contenedores |
| CI verde en `main` e insignia | No se pudo comprobar | El repositorio no tiene remoto; el workflow no se ejecutó en GitHub (ver README "Limitaciones conocidas") |
| `git log` con commits convencionales y sin trailers de atribución; sin `.env` versionado | `git log`, `git ls-files` | Cumple |
| `USO-DE-IA.md` con los dos marcadores pendientes del candidato | `rg` | Cumple |
| `docs/arquitectura-aws.png`, `docs/arquitectura-aws.md`, `docs/flujo.md` | `stat`, lectura de la imagen y render de `flujo.md` con `mermaid-cli` | El PNG pesa 242 915 bytes y se ve legible; ambos diagramas se renderizan |
| `sample-data.csv` | `rg -c ""` | 61 líneas (cabecera y 60 filas) |
| Pruebas en el clon | `npm run test:unit`, `test:integration`, `test:coverage`, frontend `npm test` | 161 unitarias (22 archivos), 33 de integración (3 archivos), 20 del frontend; cobertura de líneas global 85,37 % (cifras de la capa 10; ver README para las actuales) |

## Qué haría con más tiempo

- Publicar el repositorio y ejecutar el workflow de CI en GitHub; verificar las versiones
  de las actions.
- Un consumidor de la DLQ que marque como `FAILED` los uploads que queden en `PROCESSING`.
- Heartbeat de visibilidad con `ChangeMessageVisibility` para archivos largos con varios
  workers.
- Limpieza compensatoria del objeto de S3 si falla la creación del registro.
- Pruebas unitarias de los adaptadores de S3 y SQS (hoy solo las cubren las pruebas E2E).
- Versión optimista en `Upload` y camino de operador para reprocesar uploads en `FAILED`.
- Autenticación y multiusuario.

## Tiempo invertido
<!-- TODO (candidato): completar -->
