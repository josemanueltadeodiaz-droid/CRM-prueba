# 📋 MAPEO DE CAMPOS: admDocumentos → Órdenes de Servicio

## 📊 Resumen Ejecutivo
La tabla **admDocumentos** es reutilizada por el sistema para almacenar **Órdenes de Servicio (OS)** aprovechando sus campos genéricos. Se almacenan como documentos con características específicas identificadas por constantes fijas.

---

## 🔐 IDENTIFICADORES DE ORDEN DE SERVICIO EN admDocumentos

Para identificar que un registro en `admDocumentos` es una Orden de Servicio, se usan **3 campos de control**:

| Campo | Valor Fijo | Propósito |
|-------|-----------|----------|
| **CIDDOCUMENTODE** | `2` | Tipo de documento = Orden de Servicio |
| **CIDCONCEPTODOCUMENTO** | `3003` | Concepto = Órdenes de Servicio |
| **CSERIEDOCUMENTO** | `"OS"` | Serie = OS (Orden de Servicio) |

### Constantes en código:
```csharp
private const int TIPO_DOCUMENTO_OS = 2;           // CIDDOCUMENTODE
private const int CONCEPTO_DOCUMENTO_OS = 3003;    // CIDCONCEPTODOCUMENTO
private const string SERIE_DOCUMENTO_OS = "OS";     // CSERIEDOCUMENTO
```

---

## 📌 CAMPOS UTILIZADOS PARA CREAR ORDEN DE SERVICIO

### Tabla de Mapeo Completo

| Campo de admDocumentos | Tipo SQL | Tamaño | Valor/Fuente | Propósito en OS | Ejemplo |
|----------------------|----------|--------|--------------|-----------------|---------|
| **CIDDOCUMENTO** | INT | - | `MAX(CIDDOCUMENTO) + 1` | PK - ID único de la orden | `10542` |
| **CIDDOCUMENTODE** | INT | - | **Constante: 2** | Tipo de documento = OS | `2` |
| **CIDCONCEPTODOCUMENTO** | INT | - | **Constante: 3003** | Concepto = Órdenes de Servicio | `3003` |
| **CSERIEDOCUMENTO** | VARCHAR(11) | 11 chars | **Constante: "OS"** | Serie de documento | `"OS"` |
| **CFOLIO** | DOUBLE | - | `MAX(CFOLIO) + 1` | Número de folio único (número de OS) | `1250` |
| **CFECHA** | DATETIME | - | `DateTime.Now` | Fecha de creación de la orden | `2025-12-22 14:30:45` |
| **CFECHAEXTRA** | DATETIME | - | `orden.FechaProgramada ?? DateTime.Now` | **Fecha programada de inicio del servicio** ✅ FASE 1 | `2025-12-25 09:00:00` |
| **CIDCLIENTEPROVEEDOR** | INT | - | `orden.ClienteId` | FK - Cliente que requiere el servicio | `5` |
| **CIDAGENTE** | INT | - | `orden.TecnicoId` | FK - Técnico asignado | `12` |
| **CREFERENCIA** | VARCHAR(20) | 20 chars | `TipoOrdenServicio.ToString()` | Tipo de servicio (SOPORTE/REPARACION/CAPACITACION) | `"REPARACION"` |
| **CTEXTOEXTRA1** | VARCHAR(50) | 50 chars | `orden.Modalidad.ToString()` | **Modalidad del servicio** (REMOTO/PRESENCIAL) ✅ FASE 1 | `"PRESENCIAL"` |
| **CTEXTOEXTRA2** | VARCHAR(50) | 50 chars | `DeterminarEstadoInicial(tipo)` | **Estado inicial de la orden** ✅ FASE 1 | `"PENDIENTE"` |
| **CTEXTOEXTRA3** | VARCHAR(50) | 50 chars | `"COT-" + cotizacionId` o vacío | **Referencia a cotización de origen** | `"COT-425"` |
| **COBSERVACIONES** | TEXT | sin límite | `ConstruirObservaciones(json, obs)` | Datos JSON + Observaciones de texto | `[DATOS_JSON]{...}[/DATOS_JSON]\n\nObs...` |
| **CNETO** | DOUBLE | - | `orden.Importe` | Importe/costo de la orden | `1500.00` |
| **CCANCELADO** | INT | - | **0 (fijo)** | Estado de cancelación (0 = no cancelada) | `0` |

---

## 🔄 FLUJO DE DATOS: OrdenServicioInsertDto → admDocumentos

```
OrdenServicioInsertDto (DTO de entrada)
    ↓
OrdenServicioRepository.InsertarAsync()
    ↓ (Validaciones y transformaciones)
    ↓
INSERT INTO admDocumentos (15 campos)
    ↓
✅ Orden creada en la base de datos
```

### Parámetros del INSERT (en orden):

```sql
INSERT INTO admDocumentos (
    CIDDOCUMENTO,              -- @p0  = siguiente ID calculado
    CIDDOCUMENTODE,            -- @p1  = 2 (constante)
    CIDCONCEPTODOCUMENTO,      -- @p2  = 3003 (constante)
    CSERIEDOCUMENTO,           -- @p3  = "OS" (constante)
    CFOLIO,                    -- @p4  = siguiente folio
    CFECHA,                    -- @p5  = DateTime.Now
    CFECHAEXTRA,               -- @p6  = FechaProgramada o DateTime.Now ✅ FASE 1
    CIDCLIENTEPROVEEDOR,       -- @p7  = orden.ClienteId
    CIDAGENTE,                 -- @p8  = orden.TecnicoId
    CREFERENCIA,               -- @p9  = TipoOrdenServicio
    CTEXTOEXTRA1,              -- @p10 = Modalidad (REMOTO/PRESENCIAL) ✅ FASE 1
    CTEXTOEXTRA2,              -- @p11 = Estado inicial ✅ FASE 1
    CTEXTOEXTRA3,              -- @p12 = Referencia cotización
    COBSERVACIONES,            -- @p13 = Observaciones + JSON
    CNETO,                     -- @p14 = Importe
    CCANCELADO                 -- = 0 (siempre)
) VALUES (...)
```

---

## 💾 CAMPOS QUE NO SE USAN PARA ÓRDENES DE SERVICIO

Los siguientes campos de `admDocumentos` **NO se utilizan** para órdenes de servicio (quedan con valores default/NULL):

| Campo | Razón | Valor Default |
|-------|-------|---------------|
| CFECHAVENCIMIENTO | No aplica para OS | NULL/Default |
| CFECHAPRONTOPAGO | No aplica para OS | NULL/Default |
| CFECHAENTREGARECEPCION | No aplica para OS | NULL/Default |
| CFECHAULTIMOINTERES | No aplica para OS | NULL/Default |
| CIDMONEDA | No aplica para OS | Default |
| CTIPOCAMBIO | No aplica para OS | 0 |
| CRAZONSOCIAL | Se obtiene de admClientes | Default |
| CRFC | Se obtiene de admClientes | Default |
| CDESCUENTOMOV, CDESCUENTODOC1, CDESCUENTODOC2 | No aplica | 0 |
| CGASTO1, CGASTO2, CGASTO3 | No aplica | 0 |
| CIMPUESTO1, CIMPUESTO2, CIMPUESTO3 | No aplica | 0 |
| CRETENCION1, CRETENCION2 | No aplica | 0 |
| CPENDIENTE, CTOTALUNIDADES | No aplica | 0 |
| ... (muchos más financieros) | ... | ... |

---

## 📝 EJEMPLOS DE DATOS

### Ejemplo 1: Orden de Soporte Técnico

```csharp
var orden = new OrdenServicioInsertDto
{
    ClienteId = 5,
    TecnicoId = 12,
    TipoServicio = TipoOrdenServicio.SOPORTE,
    Modalidad = ModalidadServicio.REMOTO,
    FechaProgramada = DateTime.Parse("2025-12-25 14:00:00"),
    DatosJson = @"{
        ""descripcionProblema"": ""No conecta a internet"",
        ""sistemaOperativo"": ""Windows 10"",
        ""software"": ""Edge""
    }",
    Observaciones = "Cliente disponible después de las 2 PM",
    CotizacionId = null,
    Importe = 500m
};
```

**Resultado en admDocumentos:**
```
CIDDOCUMENTO      = 10542
CIDDOCUMENTODE    = 2
CIDCONCEPTODOCUMENTO = 3003
CSERIEDOCUMENTO   = "OS"
CFOLIO            = 1250
CFECHA            = 2025-12-22 14:30:45
CFECHAEXTRA       = 2025-12-25 14:00:00
CIDCLIENTEPROVEEDOR = 5
CIDAGENTE         = 12
CREFERENCIA       = "SOPORTE"
CTEXTOEXTRA1      = "REMOTO"
CTEXTOEXTRA2      = "PENDIENTE"
CTEXTOEXTRA3      = ""
COBSERVACIONES    = "[DATOS_JSON]{...}[/DATOS_JSON]\n\nCliente disponible..."
CNETO             = 500.00
CCANCELADO        = 0
```

---

### Ejemplo 2: Orden de Reparación (desde Cotización)

```csharp
var orden = new OrdenServicioInsertDto
{
    ClienteId = 8,
    TecnicoId = 7,
    TipoServicio = TipoOrdenServicio.REPARACION,
    Modalidad = ModalidadServicio.PRESENCIAL,
    FechaProgramada = DateTime.Parse("2025-12-23 09:00:00"),
    DatosJson = @"{
        ""equipoModelo"": ""HP ProBook 450"",
        ""numeroSerie"": ""SN123456"",
        ""problema"": ""Pantalla no prende""
    }",
    Observaciones = "Cliente solicita presupuesto antes",
    CotizacionId = 425,
    Importe = 2500m
};
```

**Resultado en admDocumentos:**
```
CIDDOCUMENTO      = 10543
CIDDOCUMENTODE    = 2
CIDCONCEPTODOCUMENTO = 3003
CSERIEDOCUMENTO   = "OS"
CFOLIO            = 1251
CFECHA            = 2025-12-22 15:00:00
CFECHAEXTRA       = 2025-12-23 09:00:00
CIDCLIENTEPROVEEDOR = 8
CIDAGENTE         = 7
CREFERENCIA       = "REPARACION"
CTEXTOEXTRA1      = "PRESENCIAL"
CTEXTOEXTRA2      = "EN_DIAGNOSTICO"      ← Estado diferente según tipo
CTEXTOEXTRA3      = "COT-425"
COBSERVACIONES    = "[DATOS_JSON]{...}[/DATOS_JSON]\n\nCliente solicita..."
CNETO             = 2500.00
CCANCELADO        = 0
```

---

## 🔍 LÓGICA DE DETERMINACIÓN DE ESTADO INICIAL

El estado inicial depende del tipo de orden:

```csharp
private string DeterminarEstadoInicial(TipoOrdenServicio tipo)
{
    return tipo switch
    {
        TipoOrdenServicio.SOPORTE      => "PENDIENTE",
        TipoOrdenServicio.REPARACION   => "EN_DIAGNOSTICO",
        TipoOrdenServicio.CAPACITACION => "PROGRAMADA",
        _ => "PENDIENTE"
    };
}
```

| Tipo de Orden | Estado Inicial |
|---------------|----------------|
| SOPORTE | PENDIENTE |
| REPARACION | EN_DIAGNOSTICO |
| CAPACITACION | PROGRAMADA |

---

## 🛠️ ESTRUCTURA DE COBSERVACIONES (Observaciones)

El campo `COBSERVACIONES` combina dos tipos de datos:

```
[DATOS_JSON]{JSON_STRING}[/DATOS_JSON]

<observaciones de texto separadas por dos saltos de línea>
```

**Ejemplo real:**
```
[DATOS_JSON]{
  "descripcionProblema": "No conecta a internet",
  "sistemaOperativo": "Windows 10",
  "software": "Edge"
}[/DATOS_JSON]

Cliente disponible después de las 2 PM
```

---

## 🔗 RELACIONES CON OTRAS TABLAS

| Campo | Tabla FK | Campo FK | Descripción |
|-------|----------|----------|-------------|
| **CIDCLIENTEPROVEEDOR** | `admClientes` | `CIDCLIENTEPROVEEDOR` | Datos del cliente (nombre, RFC, etc.) |
| **CIDAGENTE** | `admAgentes` | `CIDAGENTE` | Datos del técnico asignado |
| **CIDDOCUMENTODE** | `admDocumentosModelo` | `CIDDOCUMENTODE` | Configuración del modelo de documento (OS) |
| **CIDCONCEPTODOCUMENTO** | `admConceptos` | `CIDCONCEPTODOCUMENTO` | Configuración del concepto |
| **CIDMONEDA** | `admMonedas` | `CIDMONEDA` | Moneda (NO usada en OS) |

---

## ✅ VALIDACIONES APLICADAS AL CREAR UNA ORDEN

Antes de insertar, se validan:

1. **ClienteId > 0** → Error: "El ID del cliente debe ser mayor a 0"
2. **TecnicoId > 0** → Error: "El ID del técnico debe ser mayor a 0"
3. **Importe >= 0** → Error: "El importe no puede ser negativo"
4. **Si CotizacionId existe** → Validar que no haya otra OS de esa cotización
5. **Longitud de Modalidad ≤ 50** → Se trunca si es más larga
6. **Longitud de Estado ≤ 50** → Se trunca si es más larga
7. **Longitud de RefCotizacion ≤ 50** → Se trunca si es más larga
8. **Longitud de TipoServicio ≤ 20** → Se trunca si es más larga

---

## 📊 COMPARATIVA: Órdenes de Servicio vs Otros Documentos

`admDocumentos` se usa para múltiples tipos de documentos. Los que usan iguales constantes:

| CIDDOCUMENTODE | CIDCONCEPTODOCUMENTO | CSERIEDOCUMENTO | Uso |
|----------------|---------------------|-----------------|-----|
| 2 | 3003 | "OS" | **Órdenes de Servicio** ← Nuestro caso |
| 1 | 3001 | "FAC" | Facturas |
| 1 | 3002 | "EST" | Estimaciones |
| 3 | 3004 | "COM" | Compras |
| ... | ... | ... | ... (otros documentos) |

---

## 🚀 CICLO DE VIDA DE UNA ORDEN EN admDocumentos

```
1. INSERT (Creación)
   ├─ Estado = PENDIENTE (SOPORTE) / EN_DIAGNOSTICO (REPARACION) / PROGRAMADA (CAPACITACION)
   ├─ CCANCELADO = 0
   └─ CFECHA = NOW()

2. UPDATE (Trabajo en progreso)
   ├─ CTEXTOEXTRA2 = Estado actualizado
   ├─ COBSERVACIONES = Se agregan notas
   └─ CNETO = Se puede actualizar si cambia el importe

3. UPDATE (Finalización)
   ├─ CTEXTOEXTRA2 = "COMPLETADA"
   ├─ COBSERVACIONES = Se agregan resultados
   └─ CFECHAULTIMOINTERES = Fecha de finalización (posible uso)

4. UPDATE (Cancelación)
   ├─ CCANCELADO = 1
   ├─ CTEXTOEXTRA2 = "CANCELADA"
   └─ COBSERVACIONES = Se agrega motivo de cancelación
```

---

## 📌 NOTAS IMPORTANTES

1. **No hay tabla de Órdenes de Servicio dedicada** → Se reutiliza `admDocumentos` de legacy
2. **PK manual** → CIDDOCUMENTO no es IDENTITY, se calcula `MAX + 1`
3. **Folio manual** → CFOLIO tampoco es IDENTITY, se calcula `MAX + 1`
4. **Campos separados** ✅ FASE 1 → Modalidad y Estado ahora en campos distintos
5. **JSON en COBSERVACIONES** → Permite almacenar datos complejos del servicio
6. **Referencia cruzada** → CTEXTOEXTRA3 vincula con cotización origen

---

## 🎯 RESUMEN PRÁCTICO

Para crear una Orden de Servicio en `admDocumentos`, **necesitas proporcionar:**

| Dato | Campo DTO | Campo OS |
|------|-----------|----------|
| Cliente | `ClienteId` | CIDCLIENTEPROVEEDOR |
| Técnico | `TecnicoId` | CIDAGENTE |
| Tipo (Soporte/Reparación/Capacitación) | `TipoServicio` | CREFERENCIA |
| Forma (Remoto/Presencial) | `Modalidad` | CTEXTOEXTRA1 |
| Cuándo hacerlo | `FechaProgramada` | CFECHAEXTRA |
| Detalles | `DatosJson` | COBSERVACIONES (JSON) |
| Notas | `Observaciones` | COBSERVACIONES (texto) |
| De qué cotización | `CotizacionId` | CTEXTOEXTRA3 |
| Cuánto cuesta | `Importe` | CNETO |

**El resto se genera automáticamente:**
- ID, Folio, Fecha creación, Estado inicial, referencias a documento modelo y concepto
