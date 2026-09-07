# Documentación del Flujo de Envío de PDF por Correo

Este documento describe la lógica y funcionalidad implementada para el envío de cotizaciones en PDF por correo electrónico dentro del sistema CRM CABS.

## 1. Resumen General

El proceso permite a un usuario visualizar una cotización, previsualizarla y enviarla por correo electrónico al cliente. El flujo abarca:

1.  **Frontend**: Generación del PDF en el navegador (usando `pdfMake`), conversión a Base64 y captura de datos de envío (destinatario, asunto).
2.  **Backend**: Recepción del archivo en Base64 y metadatos, construcción del correo HTML con imágenes incrustadas y envío mediante SMTP (usando `MailKit`).

---

## 2. Flujo de Datos

1.  **Inicio**: El usuario abre el detalle de un documento en `dialog-vista-documentos.component.ts`.
2.  **Apertura de Modal**: Se invoca `modal-enviar-cotizacion.component.ts` para seleccionar destinatario y opciones (con/sin IVA).
3.  **Generación de PDF**:
    - El frontend recopila los datos de la cotización y el cliente.
    - `ExportService` utiliza `pdfMake` para generar el documento PDF.
    - Se obtiene la representación en **Base64** del archivo generado.
4.  **Solicitud al API**:
    - `ExportService.enviarCorreoCotizacion` envía un POST al backend con el PDF en Base64 y detalles del envío.
5.  **Procesamiento Backend**:
    - `PdfEmailController` valida la solicitud.
    - `PdfEmailService` decodifica el Base64, genera el cuerpo HTML del correo, adjunta el PDF y envía el email vía SMTP.

---

## 3. Implementación Frontend

### Componentes Principales

#### `dialog-vista-documentos.component.ts`

- **Responsabilidad**: Carga detalles y abre el modal de envío.

#### `modal-enviar-cotizacion.component.ts`

- **Responsabilidad**: Gestiona la selección del correo y tipo de PDF.
- **Lógica de Envío**:

  ```typescript
  // fragmento de modal-enivar-cotizacion.component.ts
  async enviarCotizacion(): Promise<void> {
      // ... (validaciones y selección de email/iva)

      // 1. Generar PDF en Base64
      let pdf: any;
      const datos = await this.prepararDatosParaPdf();

      // Llama al servicio que retorna { nombreArchivo, base64, folio }
      pdf = await this.exportService.generarBse64CotizacionCI(datos);

      // 2. Preparar payload
      const datosEnvio = {
          emailDestino,
          nombre: `${nombreCliente}`,
          asunto: 'Envio de Cotizacion',
          pdfBase64: `${pdf.base64}`, // String Base64 del PDF
          nombreArchivo: `${pdf.nombreArchivo}`,
          folio: `${pdf.folio}`,
      };

      // 3. Enviar al Backend
      await this.exportService.enviarCorreoCotizacion(
          datosEnvio.emailDestino,
          datosEnvio.nombre,
          datosEnvio.asunto,
          datosEnvio.pdfBase64,
          datosEnvio.nombreArchivo,
          datosEnvio.folio,
      );
  }
  ```

### Servicios (`ExportService`)

#### Generación de PDF en Base64

Usa `pdfMake` para crear el documento y extraer su representación en Base64.

```typescript
// fragmento de export.service.ts
async generarBse64CotizacionCI(data: CotizacionPDF) {
    // ... (carga de imágenes y definición del docDefinition)
    const docDefinition: any = this.generarDocDefinition(data, imagenes, textoTotal);

    // Crear instancia de pdfMake
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Convertir a Base64
    return new Promise((resolve, reject) => {
        try {
            pdfDoc.getBase64().then((base64: any) => {
                resolve({
                    nombreArchivo: `CC_CA00000${data.folio}.pdf`,
                    base64,
                    folio: `${data.folio}`
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}
```

#### Petición HTTP para Envío

Envía el PDF codificado y los metadatos al controlador del backend.

```typescript
// fragmento de export.service.ts
async enviarCorreoCotizacion(
    Email: string,
    Nombre: string,
    Asunto: string,
    PdfFile: string,
    NombreArchivo: string,
    Folio: string,
) {
    const url = `${this.apiUrl}/enviar`; // apiUrl apunta a /api/PdfEmail

    const payload = {
        Email: Email,
        Nombre: Nombre || 'Cliente',
        Asunto: Asunto || 'Envio de Cotizacion',
        PdfFile: PdfFile, // El string Base64
        NombreArchivo: NombreArchivo,
        Folio: Folio,
    };

    // Petición POST con credenciales (cookies)
    return await firstValueFrom(
        this.http.post(url, payload, { withCredentials: true }),
    );
}
```

---

## 4. Implementación Backend

### Controlador (`PdfEmailController`)

Recibe el Base64, lo decodifica y delega el envío al servicio.

```csharp
// fragmento de PdfEmailController.cs
[HttpPost("enviar")]
public async Task<IActionResult> EnviarPdf([FromBody] EnviarAdjuntoEmailRequestDto request)
{
    // 1. Validar entrada
    if (string.IsNullOrEmpty(request.PdfFile))
        return BadRequest(new { mensaje = "El archivo PDF es obligatorio." });

    // 2. Convertir Base64 a bytes
    byte[] pdfBytes;
    var base64Data = request.PdfFile;
    if (base64Data.Contains(",")) base64Data = base64Data.Split(',')[1]; // Limpiar prefijo data:application/pdf;base64,...
    pdfBytes = Convert.FromBase64String(base64Data);

    // 3. Llamar al servicio de envío
    var resultado = await _pdfEmailService.EnviarPdfDirectoAsync(
        request.Email,
        request.Nombre,
        request.Asunto,
        _pdfEmailService.GenerarPlantillaHtml("COTIZACION", variables), // Genera HTML del cuerpo
        pdfBytes, // Pasa el archivo como array de bytes
        request.NombreArchivo ?? "documento"
    );

    if (resultado.Exitoso) return Ok(resultado);
    else return StatusCode(500, resultado);
}
```

### Servicio (`PdfEmailService`)

Construye el mensaje MIME, adjunta el PDF y lo envía mediante SMTP.

```csharp
// fragmento de PdfEmailService.cs
public async Task<EnviarPdfEmailResponseDto> EnviarPdfInternoAsync(..., byte[] pdfBytes, ...)
{
    var message = new MimeMessage();
    message.From.Add(new MailboxAddress(senderName, senderEmail));
    message.To.Add(new MailboxAddress(destinatarioNombre, destinatarioEmail));

    var bodyBuilder = new BodyBuilder();

    // ... (Lógica para incrustar imágenes en el HTML usando ContentId) ...
    bodyBuilder.HtmlBody = mensajeHtml;

    // Adjuntar el PDF
    bodyBuilder.Attachments.Add($"{nombreArchivo}.pdf", pdfBytes, new ContentType("application", "pdf"));

    message.Body = bodyBuilder.ToMessageBody();

    // Enviar con MailKit
    using var client = new SmtpClient();
    await client.ConnectAsync(server, 587, SecureSocketOptions.StartTls);
    await client.AuthenticateAsync(username, password);
    await client.SendAsync(message);
    await client.DisconnectAsync(true);

    return EnviarPdfEmailResponseDto.Exito(destinatarioEmail, $"{nombreArchivo}.pdf");
}
```

---

## 5. Notas Adicionales

- **Librería Principal de PDF**: `pdfmake`. Se utiliza para definir la estructura del documento en JSON y generarlo en el cliente.
- **Imágenes**:
  - Frontend: Se cargan dinámicamente de `assets` y convierten a Base64 para `pdfMake`.
  - Backend: Se leen de `wwwroot` y se adjuntan como `LinkedResources` para que aparezcan en el cuerpo del correo.
- **Seguridad**: El endpoint requiere autenticación (`[Authorize]`).
