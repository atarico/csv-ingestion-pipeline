# Auditoría de confiabilidad, consistencia y seguridad

Rama `audit/reliability-review`. Todo lo marcado **[probado]** tiene un test que lo reproduce
contra PostgreSQL real; lo marcado **[medido]** tiene un script que da el número; lo marcado
**[código]** sale de leer el código y no está ejecutado.

| Archivo | Qué prueba |
|---|---|
| `backend/src/workers/Reliability.audit.integration.test.ts` | 6 tests: carreras entre dos workers, crash y redelivery, DLQ, con intercalaciones forzadas de forma determinista (gates en los repositorios, sin `sleep`) |
| `backend/src/audit/CsvAdversarial.audit.test.ts` | 9 tests de entradas CSV adversariales a través del handler y el parser reales |
| `backend/src/audit/csv-edge-cases.probe.ts` | Tabla de 33 entradas raras y lo que hace el pipeline con cada una |
| `backend/src/audit/large-file-timing.probe.ts` | Tiempo y memoria de un archivo de 5 MiB contra Postgres |

Los tests "BUG" fijan el comportamiento **actual** (incorrecto), así que pasan hoy. Cuando
se corrija un bug, su test va a fallar y hay que invertir la aserción.

---

## Respuesta corta: ¿qué garantías de exactly-once tiene el pipeline?

**Ninguna en general. Con un único worker, el resultado es "efectivamente una vez". Con dos
o más workers puede perder datos para siempre y aun así reportar `COMPLETED`.**

| Garantía | ¿Se cumple? | Evidencia |
|---|---|---|
| Entrega del mensaje | At-least-once (SQS estándar). No hay deduplicación | [código] |
| Sin filas duplicadas por upload | **Sí, siempre.** `@@unique([uploadId, rowNumber])` rechaza el segundo insert (P2002) | [probado] `OBSERVED: if B deletes before A inserts…` |
| Reproceso secuencial (crash y redelivery, un solo worker) | **Sí.** `deleteByUploadId` y luego un reinsert dan exactamente N filas | [probado] `OK: single worker, crash mid-file…` |
| Mensaje duplicado después de terminar | **Sí.** Si el estado es terminal, el mensaje se descarta | [probado] `OK: duplicate delivery after completion…` |
| Exclusión mutua entre workers sobre el mismo upload | **No.** No hay lease, lock, versión ni update condicional | [probado] |
| `processedRows` coincide con las filas persistidas | **No.** Puede quedar `COMPLETED / processedRows=1200` con **0 filas** | [probado] `BUG: two workers on the same upload…` |
| La máquina de estados es monotónica | **No.** `COMPLETED → PROCESSING` ocurre en la base | [probado] `BUG: a late progress save regresses…` |
| `POST /uploads` idempotente | **No.** Reintentar el POST crea otro upload y otro mensaje | [código] |

La afirmación del README ("`deleteByUploadId` y `@@unique` mantienen los datos correctos")
**es falsa con varios workers**. Evitan duplicados, pero no evitan pérdidas.

### La secuencia que pierde datos para siempre (test `BUG: two workers on the same upload`)

```
Worker A (receive #1)                     Worker B (receive #2, visibility expiró)
─────────────────────                     ────────────────────────────────────────
inserta filas 1..1200
(pausa antes de guardar COMPLETED:
 GC, DB lenta, archivo grande…)
                                          findById → PROCESSING (no terminal) → sigue
                                          save(PROCESSING)
                                          deleteByUploadId  ← borra las 1200 filas de A
                                          falla (timeout de S3, Spot interruption, SIGKILL…)
upsert COMPLETED, processedRows=1200
deleteMessage
                                          Worker C (receive #3): upload COMPLETED → 'dropped'
Estado final: COMPLETED, processedRows=1200, filas en ActivityData = 0. Nada lo repara.
```

Hacen falta dos condiciones, y la arquitectura AWS documentada prevé las dos:

1. **Más de un worker.** `docs/arquitectura-aws.md` describe `worker-service` con "1+ tareas,
   autoescalado por profundidad de cola", y sugiere Fargate Spot (tareas interrumpidas).
2. **Un procesamiento que dure más que el visibility timeout (60 s) sin heartbeat.**
   Medido con Postgres *local*, sin latencia de red:

| Archivo de ~5 MiB (el máximo permitido) | Tiempo | Filas |
|---|---|---|
| Filas válidas mínimas (`E,1,kWh,2024-01-01`) | **45 s** (51 s con un heap de 128 MB) | 275 939 |
| Mitad válidas, mitad inválidas | 25 s | 268 864 |
| Todas inválidas (`,,,`) | **62,5 s > 60 s** | 1 310 713 |

Con RDS y su latencia de red, un archivo válido de tamaño máximo también supera los 60 s.

### Causas raíz

1. `PrismaUploadRepository.save` hace un `upsert` ciego: el último que escribe gana
   (`PrismaUploadRepository.ts:27`). La máquina de estados de `Upload` solo se valida
   **en memoria**, contra el estado que se leyó al empezar, y la base no la protege.
2. `PROCESSING → PROCESSING` está permitido (`UploadStatus.ts:15`), así que cualquier
   redelivery "retoma" un upload que otro worker todavía está procesando.
3. `deleteByUploadId` (`ProcessFileCommandHandler.ts:106`) no está protegido (fenced): borra
   el trabajo de otro worker que sigue vivo.
4. No hay transacciones en el camino de escritura. `$transaction` solo se usa en lecturas
   paginadas.
5. No hay heartbeat de `ChangeMessageVisibility` durante el procesamiento.

### Corrección recomendada: lease con token (fencing)

```sql
-- Migración
ALTER TABLE "Upload" ADD COLUMN "leaseToken" uuid, ADD COLUMN "leaseUntil" timestamptz;
ALTER TABLE "ActivityData" ADD COLUMN "attempt" uuid NOT NULL;

-- Claim: solo uno gana; los demás devuelven el mensaje a la cola sin borrarlo
UPDATE "Upload" SET status='PROCESSING', "leaseToken"=$token, "leaseUntil"=now()+interval '90 s'
WHERE id=$id AND (status='PENDING' OR (status='PROCESSING' AND "leaseUntil" < now()))
RETURNING *;

-- Toda escritura posterior es condicional; si afecta 0 filas, el worker fue desplazado y aborta
UPDATE "Upload" SET "processedRows"=$n, "leaseUntil"=now()+interval '90 s'
WHERE id=$id AND "leaseToken"=$token;

-- Cierre atómico: limpia los intentos viejos y marca COMPLETED en una sola transacción
BEGIN;
  DELETE FROM "ActivityData" WHERE "uploadId"=$id AND "attempt"<>$token;
  UPDATE "Upload" SET status='COMPLETED', ... WHERE id=$id AND "leaseToken"=$token;  -- 0 filas → ROLLBACK
COMMIT;
```

Con esto, las filas se insertan etiquetadas con `attempt=$token`, la unicidad pasa a ser
`(uploadId, attempt, rowNumber)` y ya no hace falta el `deleteByUploadId` del principio.
Además: un heartbeat cada ~20 s que extienda **a la vez** `leaseUntil` y la visibilidad de
SQS, y que el worker aborte si no logra extender ninguna de las dos. Los tests de este
archivo sirven como especificación del fix: con el lease, `BUG: two workers…` debe terminar
con 1200 filas.

---

## 1. SQS reliability audit

| Tema | Estado | Detalle |
|---|---|---|
| Ack | ✅ | Se borra el mensaje solo ante un resultado de negocio. Si el delete falla, el redelivery lo descarta (estado terminal) |
| Retries / backoff | ✅ | 15 s, después 30 s, más jitter, con `ChangeMessageVisibility` |
| DLQ | ⚠️ | El upload se marca `FAILED` en el intento 3 **antes** del redrive. Pero si el worker muere en el intento 3, el upload queda `PROCESSING` para siempre (documentado). No hay consumidor de la DLQ ni un sweeper de uploads colgados |
| Visibility timeout | 🔴 | 60 s fijos y sin heartbeat. Medido: un archivo legítimo tarda entre 45 y 62 s |
| Duplicados concurrentes | 🔴 | Ver la sección anterior: hay pérdida de datos [probado] |
| Poison message (schema inválido) | ⚠️ | Se **borra** (`dropped`) en vez de ir a la DLQ: se pierde la evidencia. Solo queda un log con el body completo (`FileProcessingWorker.ts:92`) |
| Poison message (crash del proceso: OOM, segfault) | ⚠️ | Hace crashear al worker 3 veces, el mensaje va a la DLQ y el upload queda `PROCESSING` |
| Caídas de infraestructura | 🔴 | Una caída de la DB de más de ~2 min agota los 3 receives de **todos** los mensajes en vuelo, y todos van a la DLQ. El worker no distingue "la DB está caída" (no debería consumir intentos) de "este mensaje es venenoso" |
| `WORKER_MAX_RECEIVE_COUNT` y `maxReceiveCount` de la cola | ⚠️ | Deben coincidir, pero no se valida al arrancar (documentado). Se puede leer con `GetQueueAttributes(RedrivePolicy)` al iniciar y fallar rápido |
| Receipt handle vencido | ⚠️ | Si el procesamiento supera la visibilidad, `changeVisibility` falla (se loguea), el backoff no se aplica y el mensaje reaparece enseguida |

## 2. CSV adversarial

**¿El pipeline puede consumir memoria ilimitada?** **No en el worker** [medido]: el archivo
se procesa en streaming, con lotes de 500 y `rowErrors` con tope en 100. Los casos de 5 MiB,
incluido un único campo de 5 MiB, terminan con `--max-old-space-size=128`. Hay tres matices:

- **API:** `part.toBuffer()` (`FastifyAdapter.ts:36`) carga el archivo entero en memoria.
  Son 5 MiB por request, pero sin límite de concurrencia ni rate limit: 1000 uploads
  simultáneos son unos 5 GB. Conviene usar presigned PUT directo a S3, o limitar la
  concurrencia en la API.
- **Amplificación:** un campo inválido de 5 MiB produce un pico de RSS de unos 240 MB.
  `offendingValue` hace `Array.from` dos veces sobre la celda completa antes de truncarla a
  50 caracteres. Hay que truncar primero.
- **El worker confía en el tamaño del objeto de S3.** No verifica `ContentLength`.

**El hallazgo de CPU más importante [medido + perfilado]:** de los 52 s que tarda el archivo
`,,,` sin DB, **45 s se van en construir objetos `Error`**. `DomainError extends Error`
captura un stack trace, y cada fila inválida crea 5 (4 value objects + 1 agregado). Con
`Error.stackTraceLimit = 0` baja a **10,6 s**. La validación por fila debería devolver
objetos planos, no subclases de `Error`. Esto es lo que lleva el peor caso por encima de los
60 s.

| Entrada | Resultado | Veredicto |
|---|---|---|
| Vacío / solo espacios / solo header | `EMPTY_FILE` / `NO_DATA_ROWS` | ✅ |
| BOM UTF-8, BOM UTF-16LE, `\r\n`, `\r`, finales de línea mezclados | `COMPLETED` | ✅ |
| `;` o tab como delimitador | `INVALID_HEADER` | ✅ (UX: Excel en español exporta con `;`) |
| Columnas duplicadas, header en mayúsculas o con espacios | Rechaza / normaliza | ✅ |
| NaN, Infinity, 1e5, -1, 0, +1, "1,5", 0.00001, 11 dígitos | Error por fila | ✅ |
| 9999999999.9999 | Entra justo en `Decimal(14,4)` | ✅ |
| 2024-02-30, 01/02/2024 | Error por fila | ✅ |
| **UTF-8 inválido / Latin-1** (`Calefacci\xF3n`) | **Se guarda `Calefacci�n` como fila válida** | 🔴 corrupción silenciosa [probado] |
| **Campo extra en una fila** | **Se descarta sin error** (`relax_column_count`) | 🟠 [probado] |
| **Una comilla rota en la fila 1001** | **Falla el archivo entero**, 0 filas guardadas | 🟠 [probado] |
| `=HYPERLINK(...)`, `+cmd\|...`, `@SUM` | Se guardan textualmente | 🟠 latente [probado] |
| Zero-width (`Electricity​`), bidi (`‮`) | Se guardan como categorías distintas que se ven idénticas | 🟠 [probado] |
| Años 0100 y 9999 | Se aceptan | 🟡 no hay un rango de negocio |
| Campo con salto de línea entre comillas | Error por fila (`CONTROL_CHARACTERS`) | ✅ |

Para UTF-8 conviene decodificar con `new TextDecoder('utf-8', { fatal: true })`, o detectar
`�` y emitir `INVALID_ENCODING` (o intentar con windows-1252).

## 3. Idempotencia

Respondida arriba. En resumen: es idempotente frente a reentregas **secuenciales** y **no**
lo es frente a reentregas **concurrentes**. Las filas nunca se duplican, pero se pueden
perder.

## 4. Consistencia de la base de datos

- **Transacciones:** ninguna en el camino de escritura. `save PROCESSING`, `delete`, N ×
  (`createMany` + `upsert`) y `save COMPLETED` son todos commits independientes.
- **Isolation level:** READ COMMITTED (el default). Nada depende de un nivel más alto, pero
  tampoco hay `SELECT … FOR UPDATE` ni updates condicionales.
- **Constraints:** la FK con `ON DELETE CASCADE` y el unique de `(uploadId, rowNumber)` están
  bien. Faltan `CHECK (processedRows + failedRows <= totalRows)` y un `CHECK` sobre
  `errorCode`, que hoy es `TEXT` libre.
- **`FAILED` con filas huérfanas [probado]:** si el último intento falla a mitad, el upload
  queda `FAILED` con 500 filas en `ActivityData`, y `GET /uploads/:id/results` las sirve.
- **`processedRows` sale de contadores en memoria, no de `COUNT(*)`.** Por eso puede mentir
  (ver el test de pérdida de datos).
- **Escritura dual en `POST /uploads`:** S3, después la DB, después SQS, sin outbox. Si el
  proceso muere entre `save` y `publish` (`CreateUploadCommandHandler.ts:48-50`), el upload
  queda `PENDING` para siempre: nadie lo reencola y no hay sweeper.

## 5. Seguridad del upload

| Vector | Estado |
|---|---|
| Path traversal / manipulación de la key de S3 | ✅ La key es `uploads/<uuid>/<nombre saneado>`, sin `/` ni `\`, con `[^A-Za-z0-9._-]` reemplazado por `_`. Además, el worker **ignora** el `fileKey` del mensaje y usa el de la DB |
| MIME spoofing / extensión falsa | ✅ No es explotable: el contenido se parsea como texto y se guarda en S3 con `ContentType: text/csv` fijo. Un binario termina en `INVALID_HEADER` o `MALFORMED_CSV` |
| Tamaño | ✅ Límite de 5 MiB en multipart y en `bodyLimit` |
| Zip bombs | N/A hoy. Si se agregan archivos comprimidos, hay que limitar los bytes descomprimidos y no el tamaño del archivo |
| **CSV formula injection** | 🟠 **Latente.** Se almacena textualmente [probado]. Hoy no hay export y React escapa el HTML, así que no se explota. Cualquier export futuro debe anteponer `'` a los valores que empiecen con `= + - @ \t \r` (regla de OWASP). Mejor hacerlo en el export que en la ingesta, para no alterar datos |
| Fuga de información | 🟠 `errorMessage` (público en la API) incluye el texto crudo de excepciones de infraestructura: `Processing failed after 3 attempts: <mensaje de Prisma/S3>` (`FileProcessingWorker.ts:184`) [probado]. Expone nombres de constraints, keys de S3, hosts. Hay que guardar un mensaje genérico y loguear el detalle |
| Acceso directo a objetos | ✅ El bucket no se expone. Revisar en AWS: Block Public Access y cifrado SSE |
| Auth / IDOR | Usuario fijo, por diseño. Las queries ya filtran por `userId`, así que está bien preparado |
| Nombres maliciosos | Se aceptan bidi y zero-width en `fileName` (se ve `factura‮vsc.csv`). Menor |
| Rate limiting | 🟠 No hay. Ver la sección 2 (memoria de la API) |

## 6. Concurrencia del worker (`WORKER_MAX_MESSAGES > 1`)

Supuestos de procesamiento secuencial que aparecen en el código:

1. `processOnce` procesa el lote con un `for … await` (`FileProcessingWorker.ts:83`). **El
   reloj de visibilidad de los N mensajes arranca al recibirlos**, pero el mensaje k espera
   a que terminen los k-1 anteriores. Con 10 mensajes de unos 45 s, del segundo en adelante
   ya están vencidos al empezar. Si hay otro worker, eso dispara la carrera de pérdida de
   datos. Subir `MAX_MESSAGES` **empeora** la confiabilidad sin ganar paralelismo.
2. `stop()` espera el lote completo. Con 10 mensajes, el `stop_grace_period` de 30 s no
   alcanza, llega el SIGKILL y todos vuelven a la cola.
3. El `ProcessFileCommandHandler` es singleton pero no tiene estado mutable, así que
   paralelizarlo dentro del proceso es seguro. El problema está en la DB, no en memoria.
4. La memoria del worker (unos 150 a 450 MB de pico por archivo grande) se multiplica por N
   si se paraleliza.

**Estrategia para procesar N archivos a la vez de forma segura:** primero el lease con
fencing (sin eso, ninguna estrategia es segura). Después, un pool de concurrencia acotado
(`p-limit(N)`) que reciba solo cuando haya capacidad libre (`MaxNumberOfMessages = slots
libres`), un heartbeat por mensaje y un pool de conexiones de Prisma de al menos N + 2.
Escalar horizontalmente (más tareas con N chico) es preferible a un N grande por tarea.

## 7. Failure injection

| Falla | Qué hace hoy | Qué debería hacer |
|---|---|---|
| S3 caído (API) | `StorageError` → 502. No queda registro ni mensaje | ✅ Correcto |
| S3 caído (worker, pasada 1) | Retry; después de 3 intentos, `FAILED` y DLQ | Circuit breaker: dejar de recibir mientras S3 no responda, sin consumir intentos |
| S3 caído (worker, pasada 2) | El upload ya está `PROCESSING` y **las filas ya se borraron**. Retry | Lo mismo; con el lease se borra al cerrar, no al empezar |
| SQS caído (API) | El upload queda `FAILED / ENQUEUE_FAILED` y 502. El usuario tiene que volver a subir | Outbox: el upload queda `PENDING` y un relay publica cuando SQS vuelve |
| SQS caído (worker) | Backoff exponencial hasta 30 s | ✅ |
| Postgres caído (API) | Excepción → 500 **y objeto huérfano en S3** | Lifecycle rule de S3 para huérfanos, o subir el objeto después de crear el registro |
| Postgres caído (worker) | Agota los 3 intentos en ~2 min; todo va a la DLQ; `markUploadFailed` también falla y el upload queda `PENDING` | Circuit breaker y health check de la DB antes de recibir |
| Timeout de la DB | **No hay timeouts configurados** (ni `statement_timeout` en pg ni timeouts del adapter de Prisma). Una query colgada bloquea el worker indefinidamente mientras vence la visibilidad | `statement_timeout` y `connectionTimeoutMillis` en `PrismaPg`; `requestTimeout` explícito en los clientes AWS |
| Timeout de S3 a mitad del stream | El error del stream se propaga como excepción → retry | ✅ |
| Crash del worker | Redelivery después de 60 s y reproceso correcto (con 1 worker) [probado] | ✅. En el intento 3 el upload queda `PROCESSING`: falta un sweeper |
| Mensaje duplicado | Secuencial ✅ [probado]; concurrente 🔴 [probado] | Lease |
| Mensaje mal formado | Borrado y logueado | Mandarlo a la DLQ para conservarlo |

## 8. Backpressure y escalabilidad

Throughput medido: unas **6 000 filas/s por worker** contra un Postgres local, limitado por
la DB (sin DB, el mismo archivo tarda 3 s, es decir unas 90 000 filas/s).

| Carga | Con 1 worker | Cuello de botella |
|---|---|---|
| 10 archivos de 5 MiB | unos 7,5 min; el último espera 7 min en `PENDING` | Worker secuencial |
| 1000 archivos de 5 MiB | unas 12,5 h | Worker; con autoescalado, la DB (unas 550 escrituras de 500 filas + 550 upserts por archivo) |
| 1000 POST simultáneos | unos 5 GB en buffers de la API | Memoria de la API, sin rate limit |
| Frontend | Lista, recientes y stats se consultan **cada 5 s siempre**, aunque no haya nada en vuelo (unas 6 queries por pestaña abierta) | Polling solo si hay `PENDING/PROCESSING`, o usar SSE |

Mejoras de bajo costo: `COPY` o un `createMany` más grande, actualizar el progreso cada N
segundos en vez de cada 500 filas, una sola pasada (contar filas con `ContentLength` como
estimación), y presigned PUT para sacar el archivo de la API.

## 9. Contrato de la API

- ✅ El formato de error es uniforme (`{ error: { code, message, details }, requestId }`).
  Los códigos son coherentes: 201, 400, 404, 413, 422, 502. El `x-request-id` se valida
  como UUID.
- 🟠 `POST /uploads` no acepta `Idempotency-Key`.
- 🟠 `GET /uploads/:id/results` devuelve filas para uploads `FAILED` y `PROCESSING`. Hay que
  decidir el contrato: 409 mientras no esté `COMPLETED`, o documentar que son parciales.
- 🟠 `errorMessage` expone texto interno (sección 5).
- 🟡 La paginación por `skip` se degrada con páginas altas (`page` admite hasta 100 000).
- 🟡 No hay una especificación OpenAPI. Los esquemas zod ya existen y se podría generar con
  `zod-to-openapi`.
- 🔴 Por la regresión `COMPLETED → PROCESSING`, el cliente puede ver estados que contradicen
  la máquina de estados documentada.

## 10. Observabilidad

- ✅ Logs JSON (pino); el worker loguea `messageId`, `uploadId`, `receiveCount`,
  `durationMs`, filas procesadas y fallidas, y el outcome.
- 🟠 **No hay correlation ID de punta a punta.** El `requestId` del POST no viaja en el
  mensaje de SQS. Hay que agregarlo a `FileUploadedMessage` (o a `MessageAttributes`) y
  usarlo en `logger.child`.
- 🟠 Los logs del handler usan el logger raíz, sin `messageId` ni `receiveCount`: no se
  pueden unir con los del worker sin pasar por `uploadId`.
- 🟠 No hay métricas: duración por archivo, filas/s, edad del mensaje al empezar
  (`SentTimestamp`), outcomes por tipo, reintentos. La forma más barata en AWS es CloudWatch
  EMF desde pino.
- 🟡 No hay alarma ni log específico para "processing duration > visibility timeout", que
  es justo la señal que anticipa la carrera de pérdida de datos.

---

## Prioridades sugeridas

1. **Lease con fencing y heartbeat** (cierra la pérdida de datos, la regresión de estado y
   habilita la concurrencia).
2. **Validación por fila sin `Error`** (de 52 s a unos 10 s en el peor caso) y truncar antes
   de `Array.from`.
3. **`TextDecoder` con `fatal: true`** y un código `INVALID_ENCODING`.
4. **No exponer excepciones crudas en `errorMessage`.**
5. Timeouts explícitos en la DB y en AWS; sweeper de `PENDING`/`PROCESSING` vencidos;
   consumidor de la DLQ.
6. Outbox para `POST /uploads` e `Idempotency-Key`.
7. Correlation ID y métricas.

## Cómo reproducir

```bash
# Postgres en localhost:5432 (docker compose up -d postgres) y luego:
cd backend
npx vitest run --project integration src/workers/Reliability.audit.integration.test.ts
npx vitest run --project unit src/audit
npx tsx src/audit/csv-edge-cases.probe.ts
NODE_ENV=test npx tsx src/audit/large-file-timing.probe.ts commas   # valid | commas | bigfield | …
```
