# API de Envío de PDFs por Correo Electrónico

## Descripción
Esta API permite enviar correos electrónicos con PDFs adjuntos generados automáticamente desde plantillas HTML en el servidor.

## Endpoint
```
POST /api/PdfEmail/enviar
```

## Headers Requeridos
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

## Request Body
```json
{
  "destinatarioEmail": "cliente@ejemplo.com",
  "destinatarioNombre": "Juan Pérez",
  "asunto": "Cotización de Servicio Técnico",
  "tipoDocumento": "COTIZACION",
  "variables": {
    "cliente": "Juan Pérez García",
    "folio": "COT-2024-001",
    "mensaje": "Cotización especial con descuento del 10%"
  },
  "nombreArchivo": "cotizacion-001"
}
```

## Campos del Request

| Campo | Tipo | Requerido | Descripción | Validación |
|-------|------|-----------|-------------|------------|
| `destinatarioEmail` | string | Sí | Correo electrónico del destinatario | Email válido, máx. 150 caracteres |
| `destinatarioNombre` | string | No | Nombre del destinatario para personalizar el correo | Máx. 100 caracteres |
| `asunto` | string | Sí | Asunto del correo electrónico | Máx. 200 caracteres |
| `tipoDocumento` | string | Sí | Tipo de documento (COTIZACION, ORDEN_TRABAJO, FACTURA, REPORTE) | Máx. 20 caracteres, default: "COTIZACION" |
| `variables` | object | No | Variables para personalizar el PDF (cliente, folio, mensaje, etc.) | Objeto con pares clave-valor |
| `nombreArchivo` | string | Sí | Nombre del archivo PDF (sin extensión) | Máx. 100 caracteres, default: "documento" |

## Variables en Plantilla
El PDF se genera automáticamente usando plantillas predefinidas. Las variables permiten personalizar el contenido:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `cliente` | Nombre del cliente | "Juan Pérez García" |
| `folio` | Número de folio/referencia | "COT-2024-001" |
| `mensaje` | Mensaje adicional | "Cotización con descuento especial" |

## Tipos de Documento Soportados

- **COTIZACION**: Genera una cotización con tabla de servicios
- **ORDEN_TRABAJO**: Genera una orden de trabajo con estado
- **FACTURA**: Genera una factura con información de pago
- **REPORTE**: Genera un reporte genérico

## Response Exitosa (200 OK)
```json
{
  "exito": true,
  "mensaje": "Correo enviado exitosamente",
  "datos": {
    "destinatario": "cliente@ejemplo.com",
    "archivoAdjunto": "cotizacion-001.pdf"
  }
}
```

## Response de Error (400/500)
```json
{
  "exito": false,
  "mensaje": "Error al generar el PDF desde la plantilla",
  "codigoError": "PDF_GENERATION_ERROR"
}
```

## Ejemplo Completo
```json
{
  "destinatarioEmail": "cliente@empresa.com",
  "destinatarioNombre": "María González",
  "asunto": "Cotización de Servicios Técnicos - Folio COT-2024-001",
  "tipoDocumento": "COTIZACION",
  "variables": {
    "cliente": "María González López",
    "folio": "COT-2024-001",
    "mensaje": "Cotización válida por 30 días. Incluye descuento del 15% por volumen."
  },
  "nombreArchivo": "cotizacion-enero-2024"
}
```

## Notas Importantes
- El PDF se genera automáticamente en el servidor usando plantillas predefinidas con QuestPDF
- No es necesario enviar HTML; el servidor usa plantillas optimizadas para cada tipo de documento
- Las plantillas incluyen diseño profesional con colores corporativos de CABS
- Los PDFs generados son compatibles con todos los lectores de PDF modernos
- El sistema incluye automáticamente fecha, encabezado y pie de página corporativo
- Las variables permiten personalizar cliente, folio y mensajes específicos
- Los tipos de documento soportados generan contenido específico (tablas para cotizaciones, estados para órdenes de trabajo, etc.)

## Configuración SMTP
La API utiliza la configuración SMTP definida en `appsettings.json` bajo la sección `SmtpSettings`.