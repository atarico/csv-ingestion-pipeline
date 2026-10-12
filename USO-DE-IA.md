# Uso de Inteligencia Artificial en esta Prueba

## Herramientas utilizadas
- [x] Claude Code
- [ ] GitHub Copilot
- [ ] ChatGPT
- [ ] Cursor AI
- [x] Otra: gentle-ai, un arnés de orquestación sobre Claude Code (seguimiento de tareas y
      revisión de código con consentimiento por cambio)

## Cómo se trabajó

Trabajé con Claude Code en sesiones separadas de planificación, ejecución y revisión, y me
reservé las decisiones: qué construir, qué aceptar, qué corregir y cuándo publicar. Por fases:

1. **Lectura crítica del enunciado (2026-10-09).** Antes de escribir código pedí revisar el
   documento de la prueba buscando contradicciones y errores técnicos. Aparecieron los que
   figuran en el README en "Decisiones ante ambigüedades del enunciado": la cola en memoria
   que no puede compartirse entre procesos, el estado `PROCESSING` que nunca se asignaba y el
   orden entre encolar y crear el registro. Decidí cómo resolver cada uno y quedó escrito.

2. **Especificación por capas, verificada antes de implementar.** En una sesión de
   planificación se produjo una especificación de diez documentos (de cimientos a
   entregables) con versiones fijadas y criterios de aceptación. Antes de usarla, un
   verificador independiente la contrastó con la regla de dependencias de la arquitectura y
   encontró violaciones (el dominio importaba un tipo de la capa de aplicación; la aplicación
   importaba la infraestructura) y dos pruebas imposibles tal como estaban escritas. Se
   corrigieron antes de escribir una línea de código.

3. **Implementación capa por capa.** Claude Code implementó cada capa a partir de esa
   especificación: un agente principal (Opus 5.5) repartía cada capa entre agentes
   secundarios (Sonnet 5.5), que escribían primero las pruebas y las veían fallar,
   implementaban hasta que pasaran y ejecutaban `lint`, `typecheck` y las pruebas antes de
   cada commit. Una rama por capa (`feat/01-foundations` a `docs/10-deliverables`), unida a
   `main` con `git merge --no-ff`, y commits convencionales atómicos. El arnés gentle-ai
   evaluaba el riesgo de cada commit y, cuando un grupo de commits era de riesgo alto o
   sumaba unas 400 líneas, ejecutaba una revisión de código automática que yo autorizaba
   cada vez; acepté todas las revisiones propuestas. Los hallazgos no bloqueantes que decidí
   no corregir están en el README, en "Limitaciones conocidas".

4. **Revisión independiente y correcciones.** Terminada la implementación pedí una revisión
   independiente del resultado, con cuatro revisores de código, una evaluación con rúbrica y
   un verificador que ejecutó cada comprobación en lugar de fiarse de los informes
   (`informes/11-revision-completa.md`, fuera del repositorio). A partir de ese informe
   solicité la ronda de correcciones B1 a B10 (rama `fix/12-review-followups`), con un
   commit por tarea y pruebas primero.

5. **Revisión final previa a la entrega.** Una segunda revisión independiente
   (`informes/13-revision-final.md`) encontró que el mapeo de errores de límite del multipart
   era código muerto (M1). Elegí la corrección real, iterar `request.parts()` y mapear los
   límites de `@fastify/multipart`, en lugar de borrar el mapeo, y pedí pruebas de
   integración que la demostraran (rama `fix/13-final-round`), más los retoques de
   documentación de `docs/14-final-touches`.

6. **Ronda de interfaz.** Pedí cuatro cosas: aplicar la marca de CarbonBox, añadir un tema
   claro y oscuro, mejorar la respuesta al subir un archivo y hacer que los errores digan
   qué corregir. La especificación `12-ux-brand` se escribió en una sesión de planificación a
   partir de ese pedido, un verificador independiente la contrastó con el código (tres
   bloqueos corregidos antes de ejecutar) y Claude Code la ejecutó tarea por tarea, con las
   pruebas primero y una revisión automática por cada grupo de commits que autoricé una por
   una. El informe de la ronda incluye capturas de cada pantalla en ambos temas, generadas
   contra el stack de Docker Compose.

7. **Verificación de la ronda de interfaz y publicación.** Antes de publicarla pedí una
   tercera revisión independiente (`informes/16-revision-ux-brand.md`), que repitió todas las
   suites, la cobertura y las pruebas E2E, lanzó sondas con `curl` contra la API y contrastó
   el código con la especificación tarea por tarea. Todo lo informado se sostuvo; detectó una
   oración falsa en el README, que se corrigió en un commit propio antes del push. Cada push
   a GitHub lo autoricé yo, y cada uno terminó con el CI en verde.

Además de este documento recibí un informe didáctico por capa y por revisión (fuera del
repositorio), que usé para preparar la defensa del proyecto.

## Decisiones que tomé y cómo las validé

| Decisión | Cómo la validé |
|----------|----------------|
| Usar el SDK real de AWS (v3) contra LocalStack, detrás de puertos de la capa de aplicación, en lugar de la cola en memoria del enunciado | El enunciado exige API y worker en procesos separados; una cola en memoria no puede compartirse entre ellos. LocalStack se fijó en la última versión que funciona sin token de autenticación |
| Una rama por capa, merges `--no-ff`, commits convencionales y sin trailers de atribución | Cada capa cierra con `lint`, `typecheck` y pruebas en verde y la revisión resuelta; la lista de aceptación comprueba `git log` |
| Pruebas primero como regla, no como excepción | Cada informe registra el comando que falló (RED) y el que pasó (GREEN); la cobertura de líneas del backend quedó en 86,31 % |
| Revisión de código automática con consentimiento por cambio | Solo en la ronda de interfaz fueron cuatro tramos revisados y aprobados; los informes reproducen el texto literal de cada revisión, no un resumen |
| Tres rondas de revisión independiente con la instrucción de buscar defectos, no de confirmar | Resultado: B1 a B10 (informe 11), M1 (informe 13) y una oración falsa del README más cuatro observaciones menores (informe 16). Ninguna revisión se dio por buena sin que un verificador ejecutara los comandos |
| Corrección real de M1 en vez de eliminar el código muerto | Tres pruebas de integración que envían dos archivos, archivo y campo, y campo y archivo, y esperan `400` |
| Publicar las limitaciones conocidas en el README en lugar de ocultarlas | Aviso de subida impreciso, `value` truncado a 50 caracteres, mensajes de la API en inglés, cobertura real; cada una con su explicación |
| Push solo con mi autorización y después de verificar | Tres ejecuciones de CI en verde en GitHub: 38084387707, 38101920761 y 38291158893 |

## Qué se generó con IA

### Backend
- [x] Estructura del repositorio, configuración de TypeScript, ESLint, Prettier y Vitest
- [x] Schema de Prisma 7, migraciones y configuración con Convict
- [x] Núcleo compartido: `Either`, errores de dominio, entidad base, puertos
- [x] Modelo de dominio: agregado `Upload`, value objects y repositorios
- [x] Parser CSV (`csv-parse` detrás de `ICsvParser`) y política de cabecera
- [x] Commands, queries y handlers con sus DTOs
- [x] Adaptadores: repositorios Prisma, S3, SQS y contenedor de Awilix
- [x] API REST con Fastify y manejo de errores centralizado
- [x] Worker con reintentos con backoff, DLQ y apagado ordenado
- [x] Códigos de error estables (`errorCode`, `errorDetails`, `rowErrors[].code` y `value`) con
      migración aditiva, en la ronda de interfaz
- [x] Pruebas unitarias y de integración (247 en el backend: 202 unitarias y 45 de integración)

### Frontend
- [x] Scaffold de Next.js 16 con React Query, axios y Tailwind 4
- [x] Dashboard, listado, formulario de subida y detalle con polling cada 3 s
- [x] Tokens de diseño de la marca, Poppins autoalojada, logo e icono; tema claro y oscuro
      persistente sin parpadeo; tarjeta de archivo y diálogo de confirmación; errores
      explicados en español a partir de los códigos de la API
- [x] Componentes, hooks y pruebas (146 en el frontend)

### Infraestructura y documentación
- [x] Docker Compose con PostgreSQL y LocalStack, y script de inicialización de AWS
- [x] Dockerfiles y perfil `app` de Compose
- [x] Capa E2E: paquete `e2e/` con cinco pruebas de navegador (Playwright, Chromium) contra el
      stack de Compose, y un job `e2e` en el workflow de CI
- [x] Workflow de CI de GitHub Actions (ejecutado en GitHub: ver la lista de aceptación)
- [x] Ronda de correcciones tras la revisión independiente (ver la sección siguiente)
- [x] Ronda de interfaz y marca (ver "Cómo se trabajó")
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
- Dockerfile del frontend: se quitó la copia de `public/` porque la carpeta no existía; en la
  ronda de interfaz volvió a añadirse al crear `public/ejemplo.csv`.
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

Tras la revisión final (informe 13):

- M1: el adaptador de Fastify itera `request.parts()`, de modo que dos archivos, archivo y
  campo, o campo y archivo responden `400` a través del mapeo de límites del multipart, que
  antes era código muerto (commit `d1ac1be`, tres pruebas de integración).

Tras la revisión de la ronda de interfaz (informe 16):

- La oración del README sobre los mensajes en inglés afirmaba que la interfaz solo los
  muestra con códigos desconocidos; también los muestra como detalle de `MALFORMED_CSV`,
  `ENQUEUE_FAILED` y `PROCESSING_ERROR`. Se corrigió el texto (commit `bdb2ce0`).

## Qué aprendí

Que mi aporte está en decidir y verificar, no en teclear. Las afirmaciones que se dejaron
pasar sin ejecutar el comando que las respalda fueron justamente las que fallaron después:
una cifra de cobertura desactualizada en el README y una oración que no coincidía con el
código. Por eso ninguna cifra ni afirmación de este repositorio se dio por buena sin volver a
correrla. Aprendí también a leer el enunciado con desconfianza sana: tres contradicciones
salieron de ahí, y resolverlas por escrito antes de codificar evitó rehacer capas. Y que una
especificación revisada por alguien que no la escribió vale más que una especificación
brillante: las violaciones de la regla de dependencias que encontró el verificador se
habrían propagado a todo el proyecto.

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
- PostgreSQL rechaza `\u0000` dentro de `jsonb`; los valores de las filas con error se
  guardan con los caracteres de control reemplazados por U+FFFD.
- La API acepta un único origen (`http://localhost:3000`); abrir el frontend desde
  `127.0.0.1:3000` falla por CORS.
- Los hallazgos no bloqueantes de las revisiones automáticas que no se corrigieron están
  en el README, en "Limitaciones conocidas".
- Hasta publicar el repositorio, el workflow de CI solo se validó con `actionlint` y
  reproduciendo cada job en local. La primera ejecución en GitHub (2026-10-10) fue verde en
  los jobs `backend`, `frontend` y `e2e`, lo que confirmó las versiones `@v7` de las actions;
  las dos ejecuciones posteriores también lo fueron.

### Lista de humo manual (ejecutada una vez por Claude Code, en la capa 10)

Los pasos de las dos tablas siguientes los ejecutó Claude Code (línea de comandos y Chromium
headless con `playwright-core`); yo revisé los resultados reportados y los informes.

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

### Lista de aceptación previa a la entrega (ejecutada una vez por Claude Code, en la capa 10)

| Comprobación | Cómo se comprobó | Resultado |
|--------------|------------------|-----------|
| Clon limpio (`git clone` del repositorio local) siguiendo la opción A del README | Comandos del README, Chromium headless con `playwright-core` | `docker compose up -d`, `npm ci`, `prisma:migrate`, `prisma:generate`, API, worker y frontend funcionan; con la base nueva el dashboard muestra 0; `sample-data.csv` queda `Completado` con 60 filas en una página |
| `large-sample.csv` | Chromium headless | `Procesando` con la barra avanzando (13 500, 26 500 y 41 000 filas), luego `Completado` con `processedRows 50000`; el polling se detiene al terminar |
| `sample-with-errors.csv` | Chromium headless | `Completado`, `failedRows 6`, tabla con las filas 3, 7, 11, 15, 19 y 23 |
| `invalid-header.csv` | Chromium headless | `Fallido`, `Invalid CSV header: missing [date]` |
| `docker compose --profile app up --build` en el clon | curl y Chromium headless | `/health` devuelve `{"status":"ok"}`, el frontend responde y el flujo completo (muestra, errores, cabecera inválida y archivo grande) funciona contra los contenedores |
| CI verde en `main` e insignia | Ejecución de CI en GitHub | En la capa 10 no se pudo comprobar (sin remoto). Tras publicar, la primera ejecución (2026-10-10) fue verde: [ejecución 38084387707](https://github.com/atarico/csv-ingestion-pipeline/actions/runs/38084387707); después, [38101920761](https://github.com/atarico/csv-ingestion-pipeline/actions/runs/38101920761) y [38291158893](https://github.com/atarico/csv-ingestion-pipeline/actions/runs/38291158893) |
| `git log` con commits convencionales y sin trailers de atribución; sin `.env` versionado | `git log`, `git ls-files` | Cumple |
| `docs/arquitectura-aws.png`, `docs/arquitectura-aws.md`, `docs/flujo.md` | `stat`, lectura de la imagen y render de `flujo.md` con `mermaid-cli` | El PNG pesa 310 953 bytes (regenerado tras publicar) y se ve legible; ambos diagramas se renderizan |
| `sample-data.csv` | `rg -c ""` | 61 líneas (cabecera y 60 filas) |
| Pruebas en el clon | `npm run test:unit`, `test:integration`, `test:coverage`, frontend `npm test` | 161 unitarias (22 archivos), 33 de integración (3 archivos), 20 del frontend; cobertura de líneas global 85,37 % (cifras de la capa 10; ver README para las actuales) |

## Qué haría con más tiempo

- Un consumidor de la DLQ que marque como `FAILED` los uploads que queden en `PROCESSING`.
- Heartbeat de visibilidad con `ChangeMessageVisibility` para archivos largos con varios
  workers.
- Limpieza compensatoria del objeto de S3 si falla la creación del registro.
- Pruebas unitarias de los adaptadores de S3 y SQS (hoy solo las cubren las pruebas E2E).
- Versión optimista en `Upload` y camino de operador para reprocesar uploads en `FAILED`.
- Rechazar los bytes UTF-8 inválidos de una celda en lugar de guardarlos como U+FFFD, y
  reportar los importes negativos como `NOT_POSITIVE` en lugar de `INVALID_NUMBER`.
- Mover el foco a la tarjeta de archivo al confirmar el diálogo de subida, en vez de
  devolverlo al botón ya deshabilitado.
- Autenticación y multiusuario.

## Tiempo invertido

Cuatro días de calendario, del 9 al 12 de octubre de 2026: lectura del enunciado y
planificación el 9; implementación y primera revisión independiente el 10; correcciones,
revisión final y publicación entre el 10 y el 11; ronda de interfaz, su revisión y la
publicación final el 12. Las marcas de tiempo de `git log` miden el ritmo de los commits de
los agentes, no las horas de lectura, revisión y decisión, que fueron la mayor parte de mi
tiempo.
