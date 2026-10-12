# Archivos de ejemplo

Todos los archivos tienen la cabecera `category,amount,unit,date`, excepto
`invalid-header.csv`. Las filas se numeran como filas de datos (la fila 1 es la primera
después de la cabecera).

## `sample-data.csv` (en la raíz del repositorio)

| Campo | Valor esperado |
|-------|----------------|
| Estado final | `COMPLETED` |
| `processedRows` | 60 |
| `failedRows` | 0 |
| Contenido | 12 filas por categoría (`Electricity` kWh, `Natural Gas` m3, `Transportation` km, `Waste` kg, `Water` m3), fechas de 2024 |

## `sample-with-errors.csv`

| Campo | Valor esperado |
|-------|----------------|
| Estado final | `COMPLETED` |
| `processedRows` | 19 |
| `failedRows` | 6 |
| `rowErrors` | 7 entradas (la fila 23 produce dos) |
| Códigos (`rowErrors[].code`) | `INVALID_NUMBER` (filas 3 y 7), `INVALID_DATE` (fila 11) y `REQUIRED` (filas 15, 19 y las dos entradas de la 23) |

| Fila de datos | Defecto | Campo del error |
|---------------|---------|-----------------|
| 3 | `amount` = `-12.5` | `amount` |
| 7 | `amount` = `abc` | `amount` |
| 11 | `date` = `2024-02-30` (fecha inexistente) | `date` |
| 15 | `category` vacía | `category` |
| 19 | `unit` vacía | `unit` |
| 23 | fila con solo 2 columnas (`Water,120`) | `unit` y `date` |

## `invalid-header.csv`

| Campo | Valor esperado |
|-------|----------------|
| Estado final | `FAILED` |
| Mensaje | `Invalid CSV header: missing [date]` |
| Código | `errorCode` `INVALID_HEADER`, con `errorDetails.missing` = `["date"]` |
| Contenido | cabecera `category,amount,unit` (sin `date`) y 3 filas |

## `large-sample.csv` (se genera, no se versiona)

```bash
node samples/generate-large-sample.mjs
```

| Campo | Valor esperado |
|-------|----------------|
| Estado final | `COMPLETED` |
| `processedRows` | 50000 |
| `failedRows` | 0 |

Existe para poder observar el estado `PROCESSING` (barra de progreso y consulta cada 3 s):
con 60 filas el procesamiento dura milisegundos. El código de producción no contiene
retrasos artificiales.
