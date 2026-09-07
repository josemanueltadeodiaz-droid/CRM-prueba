import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pdfMake from 'pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { CotizacionPDF } from '../models/cotizacion-legacy.interface';

// Usamos (any) para saltar el error de "Property pdfMake does not exist"
pdfMake.addVirtualFileSystem(pdfFonts);
@Injectable({
  providedIn: 'root', // <--- Esto hace que el servicio esté disponible en toda la app
})
export class ExportService {
  private readonly apiUrl = `${environment.apiUrl}/api/PdfEmail`;
  constructor(private http: HttpClient) {}

  enviandoEmail: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  generateBase64Pdf() {
    const docDefinition = { content: 'Este es un PDF de ejemplo en Base64' };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);

    // Obtener el base64
    pdfDocGenerator.getBase64().then((data: any) => {
      console.log(data);
    });
  }
  /**
   * Exporta datos JSON a un archivo Excel (.xlsx)
   * @param data Array de objetos con los datos
   * @param fileName Nombre del archivo sin extensión
   * @param sheetName Nombre de la hoja de cálculo
   */
  exportToExcel(
    data: any[],
    fileName: string,
    sheetName: string = 'Datos',
  ): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
  }

  /**
   * Exporta datos JSON a un archivo PDF con tabla
   * @param columns Array de strings con los nombres de las columnas (headers)
   * @param data Array de arrays con los valores (rows)
   * @param title Título del reporte
   * @param fileName Nombre del archivo
   */
  exportToPdf(
    columns: string[],
    data: any[][],
    title: string,
    fileName: string,
    dateRange?: string,
  ): void {
    const doc = new jsPDF();

    // Configuración de colores corporativos
    const primaryColor = [16, 185, 129]; // Emerald 500
    const secondaryColor = [31, 41, 55]; // Gray 800
    const accentColor = [107, 114, 128]; // Gray 500

    // Header Corporativo
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('FullStack Cabs', 14, 20);

    // Título del Reporte
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 30);

    // Metadatos
    doc.setFontSize(10);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(
      `Fecha de emisión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      14,
      38,
    );

    if (dateRange) {
      doc.text(`Periodo analizado: ${dateRange}`, 14, 44);
    }

    // Línea separadora
    doc.setDrawColor(229, 231, 235);
    doc.line(14, dateRange ? 48 : 42, 196, dateRange ? 48 : 42);

    // Generar tabla con estilos profesionales
    autoTable(doc, {
      head: [columns],
      body: data,
      startY: dateRange ? 55 : 50,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: primaryColor as any,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: secondaryColor as any }, // Primera columna destacada
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Gray 50 alternado
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: secondaryColor as any,
        fontStyle: 'bold',
      },
    });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
      doc.text('Documento confidencial - Uso interno exclusivo', 14, 285);
    }

    doc.save(`${fileName}_${new Date().getTime()}.pdf`);
  }

  /**
   * Método Principal: Genera y abre el PDF
   */
  async generarPdfCotizacion(data: CotizacionPDF) {
    try {
      // 1. Carga asíncrona de imágenes desde 'assets'
      // Asegúrate de que estos archivos existan en tu carpeta src/assets/img/
      const imagenes = await this.cargarImagenesPdf();

      // Generar texto total en letras
      const totalCalculado = data.totales.total;
      const textoTotal = this.numeroALetras(totalCalculado);

      // 2. Definición del Documento
      const docDefinition: any = this.generarDocDefinition(
        data,
        imagenes,
        textoTotal,
      );

      // 3. Crear
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const nombreArchivo = `CC_CA00000${data.folio}.pdf`;
      pdfDoc.download(nombreArchivo);
    } catch (error) {
      console.error('Error al generar el PDF: ', error);
      alert('Error cargando imágenes para el reporte. Verifique la consola.');
    }
  }

  async generarPdfSinIVACotizacion(data: CotizacionPDF) {
    try {
      // 1. Carga asíncrona de imágenes desde 'assets'
      // Asegúrate de que estos archivos existan en tu carpeta src/assets/img/
      const imagenes = await this.cargarImagenesPdf();

      // Generar texto total en letras
      const totalCalculado = data.totales.total;
      const textoTotal = this.numeroALetras(totalCalculado);

      // 2. Definición del Documento
      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [30, 250, 30, 90],
        styles: this.obtenerEstilos(),

        // ==========================================
        // ENCABEZADO FIJO (Header)
        // ==========================================
        header: (currentPage: number, pageCount: number) => {
          return {
            // Márgenes para alinear el header con el cuerpo de la página
            // [Izq, Top, Der, Bottom] -> 30 a los lados igual que el documento
            margin: [30, 20, 30, 0],
            stack: [
              // 1. LOGOS Y FOLIO
              {
                columns: [
                  // COLUMNA 1: Logo CABS
                  {
                    width: 'auto',
                    stack: [
                      imagenes.logoCabs
                        ? {
                            image: imagenes.logoCabs,
                            width: 150,
                            alignment: 'left',
                          }
                        : null,
                    ],
                  },
                  // COLUMNA 2: Logo BNI
                  {
                    width: '*',
                    stack: [
                      imagenes.logoBni
                        ? {
                            image: imagenes.logoBni,
                            width: 120,
                            alignment: 'center',
                            margin: [0, 40, 0, 0],
                          }
                        : null,
                    ],
                  },
                  // COLUMNA 3: Tabla Folio
                  {
                    width: 130,
                    layout: 'noBorders',
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: 'Cotización',
                            fillColor: '#cccccc',
                            color: '#1E90FF',
                            bold: true,
                            alignment: 'center',
                            fontSize: 10,
                            margin: [0, 2, 0, 2],
                          },
                        ],
                        [
                          {
                            layout: 'noBorders',
                            margin: [0, 5, 0, 0],
                            table: {
                              widths: [35, '*'],
                              body: [
                                [
                                  { text: 'Serie:', fontSize: 8, bold: true },
                                  { text: data.serie, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Folio:', fontSize: 8, bold: true },
                                  { text: data.folio, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Fecha:', fontSize: 8, bold: true },
                                  { text: data.fecha, fontSize: 8 },
                                ],
                              ],
                            },
                          },
                        ],
                      ],
                    },
                  },
                ],
              },

              // 2. DATOS EMPRESA (Barra Azul)
              {
                margin: [0, 0, 0, 0],
                fillColor: '#1E90FF',
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: data.empresa.nombre,
                            fontSize: 16,
                            bold: true,
                            color: 'white',
                          },
                          {
                            text: data.empresa.rfc,
                            fontSize: 12,
                            color: 'white',
                            margin: [0, 2, 0, 5],
                          },
                          {
                            columns: [
                              {
                                text: `Calle: ${data.empresa.direccion}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                              {
                                text: `Col: ${data.empresa.colonia}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                            ],
                          },
                          {
                            columns: [
                              {
                                text: `CP/Lugar: ${data.empresa.cpCiudadEstado}`,
                                fontSize: 10,
                                color: 'white',
                              },
                              {
                                text: `Tel: ${data.empresa.telefono}`,
                                fontSize: 10,
                                color: 'white',
                              },
                            ],
                          },
                        ],
                        margin: [5, 5, 5, 5],
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: 'noBorders',
              },

              // 3. DATOS DEL CLIENTE
              {
                style: 'boxCliente',
                // Quitamos el margin inferior aquí para que no empuje tanto,
                // el espacio lo dará el pageMargins del documento.
                margin: [0, 0, 0, 0],
                table: {
                  widths: [50, '*', 45, '*', 25, 70],
                  body: [
                    // Fila 1
                    [
                      { text: 'Cliente:', style: 'labelClient' },
                      {
                        text: data.cliente.nombre,
                        style: 'dataClient',
                        colSpan: 3,
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                      {},
                      {
                        text: 'VIGENCIA COTIZACION',
                        style: 'labelClient',
                        colSpan: 2,
                        alignment: 'center',
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 2
                    [
                      { text: 'RFC:', style: 'labelClient' },
                      {
                        text: data.cliente.rfc,
                        style: 'dataClient',
                        colSpan: 3,
                      },
                      {},
                      {},
                      {
                        text: data.fechaVencimiento,
                        style: 'dataClient',
                        colSpan: 2,
                        alignment: 'center',
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 3
                    [
                      { text: 'Domicilio:', style: 'labelClient' },
                      {
                        text: data.cliente.direccion,
                        style: 'dataClient',
                        colSpan: 5,
                      },
                      {},
                      {},
                      {},
                      {},
                    ],
                    // Fila 4
                    [
                      { text: 'Teléfono:', style: 'labelClient' },
                      { text: data.cliente.telefono, style: 'dataClient' },
                      { text: 'Colonia:', style: 'labelClient' },
                      { text: data.cliente.colonia, style: 'dataClient' },
                      { text: 'CP:', style: 'labelClient' },
                      { text: data.cliente.cp, style: 'dataClient' },
                    ],
                    // Fila 5
                    [
                      { text: 'Localidad:', style: 'labelClient' },
                      { text: data.cliente.ciudad, style: 'dataClient' },
                      { text: 'Estado:', style: 'labelClient' },
                      { text: 'Durango', style: 'dataClient' },
                      { text: 'Pais:', style: 'labelClient' },
                      { text: 'México', style: 'dataClient' },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 0,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 0,
                  hLineColor: () => '#1E90FF',
                  vLineColor: () => '#1E90FF',
                  paddingLeft: (i: number) => (i === 0 ? 5 : 2),
                  paddingRight: (i: number, node: any) =>
                    i === node.table.widths.length - 1 ? 5 : 2,
                  paddingTop: (i: number) => 0,
                  paddingBottom: (i: number) => 0,
                },
              },
            ],
          };
        },
        content: [
          // ==========================================
          // 4. TABLA DE PRODUCTOS (Simplificada)
          // ==========================================
          {
            margin: [0, 0, 0, 10],
            stack: [
              {
                table: {
                  headerRows: 1,
                  // Ajuste de anchos: Cantidad(40), Unidad(40), Descripción(Libre), Importe(80)
                  widths: [40, 40, '*', 80],

                  body: this.construirTablaProductosSinIVA(data.productos),
                },

                layout: {
                  hLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length
                      ? '#1E90FF'
                      : 'black',
                  vLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length
                      ? '#1E90FF'
                      : 'black',
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 1,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 1,
                  fillColor: (rowIndex: number) =>
                    rowIndex === 0 ? '#808080' : null,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 2,
                  paddingBottom: () => 2,
                },
              },
            ],
          },

          // ==========================================
          // 5. TOTALES (Solo Total Final)
          // ==========================================
          {
            unbreakable: true,
            stack: [
              {
                margin: [0, 15, 0, 0],
                columns: [
                  // COLUMNA IZQUIERDA: Importe con Letra y Condiciones
                  {
                    width: '*',
                    stack: [
                      {
                        table: {
                          widths: ['*'],
                          body: [
                            [
                              {
                                text: 'Importe con letra',
                                style: 'headerBlueBox',
                                alignment: 'center',
                              },
                            ],
                            [
                              {
                                text: textoTotal,
                                style: 'textLetra',
                                alignment: 'center',
                                fillColor: '#e0e0e0',
                              },
                            ],
                          ],
                        },
                        layout: 'noBorders',
                        margin: [0, 0, 10, 10],
                      },
                      {
                        text: '-CONDICIONES DE VENTA:',
                        fontSize: 8,
                        bold: true,
                      },
                      {
                        text: data.observaciones,
                        fontSize: 8,
                        margin: [0, 2, 0, 0],
                      },
                    ],
                  },

                  // COLUMNA DERECHA: Tabla de Totales (Simplificada)
                  {
                    width: 170,
                    table: {
                      widths: ['*', 75],
                      body: [
                        // Se eliminaron Subtotal, Descuentos e IVA
                        [
                          {
                            text: 'Total',
                            style: 'labelTotalBig',
                            fillColor: '#cccccc',
                          },
                          {
                            text: this.formatMoney(data.totales.total),
                            style: 'valTotalBig',
                            fillColor: '#cccccc',
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
            ],
          },
        ],
        // Propiedad FOOTER: Esto se repite al final de cada página automáticamente
        footer: (currentPage: number, pageCount: number) => {
          return {
            // Margen superior negativo o ajuste para separarlo del borde
            margin: [30, 0, 30, 20],
            stack: [
              // 1. LÍNEA WHATSAPP + TEXTO (Agrupados y Centrados)
              {
                // TRUCO: Una tabla sin bordes que se ajusta al contenido ('auto')
                // Esto obliga al icono y al texto a estar pegados.
                table: {
                  widths: ['17%', '*'],
                  body: [
                    [
                      // Celda 1: Icono
                      imagenes.iconWhats
                        ? {
                            image: imagenes.iconWhats,
                            width: 18, // Ligeramente más chico para alinear mejor
                            margin: [0, 2, 0, 0], // [izq, top, der, bot] - 5px a la derecha para separar del texto
                            alignment: 'right', // Alineado a la izq DE SU CELDA
                          }
                        : 'whatsapp',

                      // Celda 2: Texto
                      {
                        text: 'Ahora puedes realizar tus pagos en línea (Solicita informes, Cel: 618 133 27 14)',
                        style: 'footerPromo',
                        alignment: 'left', // Alineado a la izq DE SU CELDA
                        margin: [0, 3, 0, 0], // Ajuste vertical para centrar con el icono
                      },
                    ],
                  ],
                },
                // Alineamos la TABLA entera al centro de la página
                alignment: 'center',
                layout: 'noBorders',
              },

              // 2. LOGOS DE MARCAS (Debajo)
              imagenes.logoMarcas
                ? {
                    image: imagenes.logoMarcas,
                    width: 500,
                    alignment: 'center',
                    margin: [0, 0, 0, 5], // Espacio entre el texto de arriba y la imagen
                  }
                : null,
            ],
          };
        },
      };
      // 3. Crear y Abrir PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      // Genera el nombre del archivo usando el folio para que sea ordenado
      const nombreArchivo = `CC_CA00000${data.folio}.pdf`;
      pdfDoc.download(nombreArchivo);
    } catch (error) {
      console.error('Error al generar el PDF: ', error);
    }
  }

  async generarPdfOrdenCompra(data: CotizacionPDF) {
    try {
      // 1. Carga asíncrona de imágenes desde 'assets'
      // Asegúrate de que estos archivos existan en tu carpeta src/assets/img/
      const imagenes = await this.cargarImagenesPdf();

      // Generar texto total en letras
      const totalCalculado = data.totales.total;
      const textoTotal = this.numeroALetras(totalCalculado);

      // 2. Definición del Documento
      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [30, 250, 30, 90],
        styles: this.obtenerEstilos(),

        // ==========================================
        // ENCABEZADO FIJO (Header)
        // ==========================================
        header: (currentPage: number, pageCount: number) => {
          return {
            // Márgenes para alinear el header con el cuerpo de la página
            // [Izq, Top, Der, Bottom] -> 30 a los lados igual que el documento
            margin: [30, 20, 30, 0],
            stack: [
              // 1. LOGOS Y FOLIO
              {
                columns: [
                  // COLUMNA 1: Logo CABS
                  {
                    width: 'auto',
                    stack: [
                      imagenes.logoCabs
                        ? {
                            image: imagenes.logoCabs,
                            width: 150,
                            alignment: 'left',
                          }
                        : null,
                    ],
                  },
                  // COLUMNA 2: Logo BNI
                  {
                    width: '*',
                    stack: [
                      imagenes.logoBni
                        ? {
                            image: imagenes.logoBni,
                            width: 120,
                            alignment: 'center',
                            margin: [0, 40, 0, 0],
                          }
                        : null,
                    ],
                  },
                  // COLUMNA 3: Tabla Folio
                  {
                    width: 130,
                    layout: 'noBorders',
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: 'Orden de Compra',
                            fillColor: '#cccccc',
                            color: '#1E90FF',
                            bold: true,
                            alignment: 'center',
                            fontSize: 10,
                            margin: [0, 2, 0, 2],
                          },
                        ],
                        [
                          {
                            layout: 'noBorders',
                            margin: [0, 5, 0, 0],
                            table: {
                              widths: [35, '*'],
                              body: [
                                [
                                  { text: 'Serie:', fontSize: 8, bold: true },
                                  { text: data.serie, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Folio:', fontSize: 8, bold: true },
                                  { text: data.folio, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Fecha:', fontSize: 8, bold: true },
                                  { text: data.fecha, fontSize: 8 },
                                ],
                              ],
                            },
                          },
                        ],
                      ],
                    },
                  },
                ],
              },

              // 2. DATOS EMPRESA (Barra Azul)
              {
                margin: [0, 0, 0, 0],
                fillColor: '#1E90FF',
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: data.empresa.nombre,
                            fontSize: 16,
                            bold: true,
                            color: 'white',
                          },
                          {
                            text: data.empresa.rfc,
                            fontSize: 12,
                            color: 'white',
                            margin: [0, 2, 0, 5],
                          },
                          {
                            columns: [
                              {
                                text: `Calle: ${data.empresa.direccion}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                              {
                                text: `Col: ${data.empresa.colonia}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                            ],
                          },
                          {
                            columns: [
                              {
                                text: `CP/Lugar: ${data.empresa.cpCiudadEstado}`,
                                fontSize: 10,
                                color: 'white',
                              },
                              {
                                text: `Tel: ${data.empresa.telefono}`,
                                fontSize: 10,
                                color: 'white',
                              },
                            ],
                          },
                        ],
                        margin: [5, 5, 5, 5],
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: 'noBorders',
              },

              // 3. DATOS DEL CLIENTE
              {
                style: 'boxCliente',
                // Quitamos el margin inferior aquí para que no empuje tanto,
                // el espacio lo dará el pageMargins del documento.
                margin: [0, 0, 0, 0],
                table: {
                  widths: [50, '*', 45, '*', 25, 70],
                  body: [
                    // Fila 1
                    [
                      { text: 'Cliente:', style: 'labelClient' },
                      {
                        text: data.cliente.nombre,
                        style: 'dataClient',
                        colSpan: 3,
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                      {},
                      {
                        text: 'VIGENCIA',
                        style: 'labelClient',
                        colSpan: 2,
                        alignment: 'center',
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 2
                    [
                      { text: 'RFC:', style: 'labelClient' },
                      {
                        text: data.cliente.rfc,
                        style: 'dataClient',
                        colSpan: 3,
                      },
                      {},
                      {},
                      {
                        text: data.fechaVencimiento,
                        style: 'dataClient',
                        colSpan: 2,
                        alignment: 'center',
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 3
                    [
                      { text: 'Domicilio:', style: 'labelClient' },
                      {
                        text: data.cliente.direccion,
                        style: 'dataClient',
                        colSpan: 5,
                      },
                      {},
                      {},
                      {},
                      {},
                    ],
                    // Fila 4
                    [
                      { text: 'Teléfono:', style: 'labelClient' },
                      { text: data.cliente.telefono, style: 'dataClient' },
                      { text: 'Colonia:', style: 'labelClient' },
                      { text: data.cliente.colonia, style: 'dataClient' },
                      { text: 'CP:', style: 'labelClient' },
                      { text: data.cliente.cp, style: 'dataClient' },
                    ],
                    // Fila 5
                    [
                      { text: 'Localidad:', style: 'labelClient' },
                      { text: data.cliente.ciudad, style: 'dataClient' },
                      { text: 'Estado:', style: 'labelClient' },
                      { text: 'Durango', style: 'dataClient' },
                      { text: 'Pais:', style: 'labelClient' },
                      { text: 'México', style: 'dataClient' },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 0,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 0,
                  hLineColor: () => '#1E90FF',
                  vLineColor: () => '#1E90FF',
                  paddingLeft: (i: number) => (i === 0 ? 5 : 2),
                  paddingRight: (i: number, node: any) =>
                    i === node.table.widths.length - 1 ? 5 : 2,
                  paddingTop: (i: number) => 0,
                  paddingBottom: (i: number) => 0,
                },
              },
            ],
          };
        },
        content: [
          // ==========================================
          // 4. TABLA DE PRODUCTOS (Simplificada)
          // ==========================================
          {
            margin: [0, 0, 0, 10],
            stack: [
              {
                table: {
                  headerRows: 1,
                  // Ajuste de anchos: Cantidad(40), Unidad(40), Descripción(Libre), Importe(80)
                  widths: [40, 40, '*', 80],

                  body: this.construirTablaProductosSinIVA(data.productos),
                },

                layout: {
                  hLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length
                      ? '#1E90FF'
                      : 'black',
                  vLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length
                      ? '#1E90FF'
                      : 'black',
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 1,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 1,
                  fillColor: (rowIndex: number) =>
                    rowIndex === 0 ? '#808080' : null,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 2,
                  paddingBottom: () => 2,
                },
              },
            ],
          },

          // ==========================================
          // 5. TOTALES (Solo Total Final)
          // ==========================================
          {
            unbreakable: true,
            stack: [
              {
                margin: [0, 15, 0, 0],
                columns: [
                  // COLUMNA IZQUIERDA: Importe con Letra y Condiciones
                  {
                    width: '*',
                    stack: [
                      {
                        table: {
                          widths: ['*'],
                          body: [
                            [
                              {
                                text: 'Importe con letra',
                                style: 'headerBlueBox',
                                alignment: 'center',
                              },
                            ],
                            [
                              {
                                text: textoTotal,
                                style: 'textLetra',
                                alignment: 'center',
                                fillColor: '#e0e0e0',
                              },
                            ],
                          ],
                        },
                        layout: 'noBorders',
                        margin: [0, 0, 10, 10],
                      },
                      {
                        text: '-CONDICIONES DE VENTA:',
                        fontSize: 8,
                        bold: true,
                      },
                      {
                        text: data.observaciones,
                        fontSize: 8,
                        margin: [0, 2, 0, 0],
                      },
                    ],
                  },

                  // COLUMNA DERECHA: Tabla de Totales (Simplificada)
                  {
                    width: 170,
                    table: {
                      widths: ['*', 75],
                      body: [
                        // Se eliminaron Subtotal, Descuentos e IVA
                        [
                          {
                            text: 'Total',
                            style: 'labelTotalBig',
                            fillColor: '#cccccc',
                          },
                          {
                            text: this.formatMoney(data.totales.total),
                            style: 'valTotalBig',
                            fillColor: '#cccccc',
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
            ],
          },
        ],
        // Propiedad FOOTER: Esto se repite al final de cada página automáticamente
        footer: (currentPage: number, pageCount: number) => {
          return {
            // Margen superior negativo o ajuste para separarlo del borde
            margin: [30, 0, 30, 20],
            stack: [
              // 1. LÍNEA WHATSAPP + TEXTO (Agrupados y Centrados)
              {
                // TRUCO: Una tabla sin bordes que se ajusta al contenido ('auto')
                // Esto obliga al icono y al texto a estar pegados.
                table: {
                  widths: ['17%', '*'],
                  body: [
                    [
                      // Celda 1: Icono
                      imagenes.iconWhats
                        ? {
                            image: imagenes.iconWhats,
                            width: 18, // Ligeramente más chico para alinear mejor
                            margin: [0, 2, 0, 0], // [izq, top, der, bot] - 5px a la derecha para separar del texto
                            alignment: 'right', // Alineado a la izq DE SU CELDA
                          }
                        : 'whatsapp',

                      // Celda 2: Texto
                      {
                        text: 'Ahora puedes realizar tus pagos en línea (Solicita informes, Cel: 618 133 27 14)',
                        style: 'footerPromo',
                        alignment: 'left', // Alineado a la izq DE SU CELDA
                        margin: [0, 3, 0, 0], // Ajuste vertical para centrar con el icono
                      },
                    ],
                  ],
                },
                // Alineamos la TABLA entera al centro de la página
                alignment: 'center',
                layout: 'noBorders',
              },

              // 2. LOGOS DE MARCAS (Debajo)
              imagenes.logoMarcas
                ? {
                    image: imagenes.logoMarcas,
                    width: 500,
                    alignment: 'center',
                    margin: [0, 0, 0, 5], // Espacio entre el texto de arriba y la imagen
                  }
                : null,
            ],
          };
        },
      };
      // 3. Crear y Abrir PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      // Genera el nombre del archivo usando el folio para que sea ordenado
      const nombreArchivo = `CC_OC00000${data.folio}.pdf`;
      pdfDoc.download(nombreArchivo);
    } catch (error) {
      console.error('Error al generar el PDF: ', error);
    }
  }

  async generarBse64CotizacionCI(data: CotizacionPDF) {
    try {
      // 1. Carga asíncrona de imágenes desde 'assets'
      // Asegúrate de que estos archivos existan en tu carpeta src/assets/img/
      const imagenes = await this.cargarImagenesPdf();
      console.log('imagen: ', imagenes);
      // Generar texto total en letras
      const totalCalculado = data.totales.total;
      const textoTotal = this.numeroALetras(totalCalculado);

      // 2. Definición del Documento
      const docDefinition: any = this.generarDocDefinition(
        data,
        imagenes,
        textoTotal,
      );

      // 3. Crear y obtener base64
      const pdfDoc = pdfMake.createPdf(docDefinition);
      const nombreArchivo = `CC_CA00000${data.folio}.pdf`;
      const folio = `${data.folio}`;
      return new Promise((resolve, reject) => {
        try {
          pdfDoc.getBase64().then((base64: any) => {
            resolve({ nombreArchivo, base64, folio });
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error al generar el PDF: ', error);
      alert('Error cargando imágenes para el reporte. Verifique la consola.');
      return error;
    }
  }

  async generarBase64SinIVACotizacion(data: CotizacionPDF) {
    try {
      // 1. Carga asíncrona de imágenes desde 'assets'
      // Asegúrate de que estos archivos existan en tu carpeta src/assets/img/
      const imagenes = await this.cargarImagenesPdf();

      // Generar texto total en letras
      const totalCalculado = data.totales.total;
      const textoTotal = this.numeroALetras(totalCalculado);

      // 2. Definición del Documento
      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [30, 250, 30, 90],
        styles: this.obtenerEstilos(),
        images: {
          logoCabs: imagenes.logoCabs, // El alias 'logoCabs' apunta al Base64 real
          logoBNI: imagenes.logoBni,
          iconWhats: imagenes.iconWhats,
          logoMarcas: imagenes.logoMarcas,
        },
        // ==========================================
        // ENCABEZADO FIJO (Header)
        // ==========================================
        header: (currentPage: number, pageCount: number) => {
          return {
            // Márgenes para alinear el header con el cuerpo de la página
            // [Izq, Top, Der, Bottom] -> 30 a los lados igual que el documento
            margin: [30, 20, 30, 0],
            stack: [
              // 1. LOGOS Y FOLIO
              {
                columns: [
                  // COLUMNA 1: Logo CABS
                  {
                    width: 'auto',
                    stack: [
                      imagenes.logoCabs
                        ? {
                            image: 'logoCabs',
                            width: 150,
                            alignment: 'left',
                          }
                        : 'logoCabs',
                    ],
                  },
                  // COLUMNA 2: Logo BNI
                  {
                    width: '*',
                    stack: [
                      imagenes.logoBni
                        ? {
                            image: imagenes.logoBni,
                            width: 120,
                            alignment: 'center',
                            margin: [0, 40, 0, 0],
                          }
                        : imagenes.logoBni,
                    ],
                  },
                  // COLUMNA 3: Tabla Folio
                  {
                    width: 130,
                    layout: 'noBorders',
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: 'Cotización',
                            fillColor: '#cccccc',
                            color: '#1E90FF',
                            bold: true,
                            alignment: 'center',
                            fontSize: 10,
                            margin: [0, 2, 0, 2],
                          },
                        ],
                        [
                          {
                            layout: 'noBorders',
                            margin: [0, 5, 0, 0],
                            table: {
                              widths: [35, '*'],
                              body: [
                                [
                                  { text: 'Serie:', fontSize: 8, bold: true },
                                  { text: data.serie, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Folio:', fontSize: 8, bold: true },
                                  { text: data.folio, fontSize: 8, bold: true },
                                ],
                                [
                                  { text: 'Fecha:', fontSize: 8, bold: true },
                                  { text: data.fecha, fontSize: 8 },
                                ],
                              ],
                            },
                          },
                        ],
                      ],
                    },
                  },
                ],
              },

              // 2. DATOS EMPRESA (Barra Azul)
              {
                margin: [0, 0, 0, 0],
                fillColor: '#1E90FF',
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: data.empresa.nombre,
                            fontSize: 16,
                            bold: true,
                            color: 'white',
                          },
                          {
                            text: data.empresa.rfc,
                            fontSize: 12,
                            color: 'white',
                            margin: [0, 2, 0, 5],
                          },
                          {
                            columns: [
                              {
                                text: `Calle: ${data.empresa.direccion}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                              {
                                text: `Col: ${data.empresa.colonia}`,
                                fontSize: 10,
                                color: 'white',
                                bold: true,
                              },
                            ],
                          },
                          {
                            columns: [
                              {
                                text: `CP/Lugar: ${data.empresa.cpCiudadEstado}`,
                                fontSize: 10,
                                color: 'white',
                              },
                              {
                                text: `Tel: ${data.empresa.telefono}`,
                                fontSize: 10,
                                color: 'white',
                              },
                            ],
                          },
                        ],
                        margin: [5, 5, 5, 5],
                        border: [false, false, false, false],
                      },
                    ],
                  ],
                },
                layout: 'noBorders',
              },

              // 3. DATOS DEL CLIENTE
              {
                style: 'boxCliente',
                // Quitamos el margin inferior aquí para que no empuje tanto,
                // el espacio lo dará el pageMargins del documento.
                margin: [0, 0, 0, 0],
                table: {
                  widths: [50, '*', 45, '*', 25, 70],
                  body: [
                    // Fila 1
                    [
                      { text: 'Cliente:', style: 'labelClient' },
                      {
                        text: data.cliente.nombre,
                        style: 'dataClient',
                        colSpan: 3,
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                      {},
                      {
                        text: 'VIGENCIA COTIZACION',
                        style: 'labelClient',
                        colSpan: 2,
                        alignment: 'center',
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 2
                    [
                      { text: 'RFC:', style: 'labelClient' },
                      {
                        text: data.cliente.rfc,
                        style: 'dataClient',
                        colSpan: 3,
                      },
                      {},
                      {},
                      {
                        text: data.fechaVencimiento,
                        style: 'dataClient',
                        colSpan: 2,
                        alignment: 'center',
                        bold: true,
                        fontSize: 9,
                      },
                      {},
                    ],
                    // Fila 3
                    [
                      { text: 'Domicilio:', style: 'labelClient' },
                      {
                        text: data.cliente.direccion,
                        style: 'dataClient',
                        colSpan: 5,
                      },
                      {},
                      {},
                      {},
                      {},
                    ],
                    // Fila 4
                    [
                      { text: 'Teléfono:', style: 'labelClient' },
                      { text: data.cliente.telefono, style: 'dataClient' },
                      { text: 'Colonia:', style: 'labelClient' },
                      { text: data.cliente.colonia, style: 'dataClient' },
                      { text: 'CP:', style: 'labelClient' },
                      { text: data.cliente.cp, style: 'dataClient' },
                    ],
                    // Fila 5
                    [
                      { text: 'Localidad:', style: 'labelClient' },
                      { text: data.cliente.ciudad, style: 'dataClient' },
                      { text: 'Estado:', style: 'labelClient' },
                      { text: 'Durango', style: 'dataClient' },
                      { text: 'Pais:', style: 'labelClient' },
                      { text: 'México', style: 'dataClient' },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 0,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 0,
                  hLineColor: () => '#1E90FF',
                  vLineColor: () => '#1E90FF',
                  paddingLeft: (i: number) => (i === 0 ? 5 : 2),
                  paddingRight: (i: number, node: any) =>
                    i === node.table.widths.length - 1 ? 5 : 2,
                  paddingTop: (i: number) => 0,
                  paddingBottom: (i: number) => 0,
                },
              },
            ],
          };
        },
        content: [
          // ==========================================
          // 4. TABLA DE PRODUCTOS (Simplificada)
          // ==========================================
          {
            margin: [0, 0, 0, 10],
            stack: [
              {
                table: {
                  headerRows: 1,
                  // Ajuste de anchos: Cantidad(40), Unidad(40), Descripción(Libre), Importe(80)
                  widths: [40, 40, '*', 80],

                  body: this.construirTablaProductosSinIVA(data.productos),
                },

                layout: {
                  hLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length
                      ? '#1E90FF'
                      : 'black',
                  vLineColor: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length
                      ? '#1E90FF'
                      : 'black',
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.body.length ? 2 : 1,
                  vLineWidth: (i: number, node: any) =>
                    i === 0 || i === node.table.widths.length ? 2 : 1,
                  fillColor: (rowIndex: number) =>
                    rowIndex === 0 ? '#808080' : null,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 2,
                  paddingBottom: () => 2,
                },
              },
            ],
          },

          // ==========================================
          // 5. TOTALES (Solo Total Final)
          // ==========================================
          {
            unbreakable: true,
            stack: [
              {
                margin: [0, 15, 0, 0],
                columns: [
                  // COLUMNA IZQUIERDA: Importe con Letra y Condiciones
                  {
                    width: '*',
                    stack: [
                      {
                        table: {
                          widths: ['*'],
                          body: [
                            [
                              {
                                text: 'Importe con letra',
                                style: 'headerBlueBox',
                                alignment: 'center',
                              },
                            ],
                            [
                              {
                                text: textoTotal,
                                style: 'textLetra',
                                alignment: 'center',
                                fillColor: '#e0e0e0',
                              },
                            ],
                          ],
                        },
                        layout: 'noBorders',
                        margin: [0, 0, 10, 10],
                      },
                      {
                        text: '-CONDICIONES DE VENTA:',
                        fontSize: 8,
                        bold: true,
                      },
                      {
                        text: data.observaciones,
                        fontSize: 8,
                        margin: [0, 2, 0, 0],
                      },
                    ],
                  },

                  // COLUMNA DERECHA: Tabla de Totales (Simplificada)
                  {
                    width: 170,
                    table: {
                      widths: ['*', 75],
                      body: [
                        // Se eliminaron Subtotal, Descuentos e IVA
                        [
                          {
                            text: 'Total',
                            style: 'labelTotalBig',
                            fillColor: '#cccccc',
                          },
                          {
                            text: this.formatMoney(data.totales.total),
                            style: 'valTotalBig',
                            fillColor: '#cccccc',
                          },
                        ],
                      ],
                    },
                    layout: 'noBorders',
                  },
                ],
              },
            ],
          },
        ],
        // Propiedad FOOTER: Esto se repite al final de cada página automáticamente
        footer: (currentPage: number, pageCount: number) => {
          return {
            // Margen superior negativo o ajuste para separarlo del borde
            margin: [30, 0, 30, 20],
            stack: [
              // 1. LÍNEA WHATSAPP + TEXTO (Agrupados y Centrados)
              {
                // TRUCO: Una tabla sin bordes que se ajusta al contenido ('auto')
                // Esto obliga al icono y al texto a estar pegados.
                table: {
                  widths: ['17%', '*'],
                  body: [
                    [
                      // Celda 1: Icono
                      imagenes.iconWhats
                        ? {
                            image: imagenes.iconWhats,
                            width: 18, // Ligeramente más chico para alinear mejor
                            margin: [0, 2, 0, 0], // [izq, top, der, bot] - 5px a la derecha para separar del texto
                            alignment: 'right', // Alineado a la izq DE SU CELDA
                          }
                        : 'whatsapp',

                      // Celda 2: Texto
                      {
                        text: 'Ahora puedes realizar tus pagos en línea (Solicita informes, Cel: 618 133 27 14)',
                        style: 'footerPromo',
                        alignment: 'left', // Alineado a la izq DE SU CELDA
                        margin: [0, 3, 0, 0], // Ajuste vertical para centrar con el icono
                      },
                    ],
                  ],
                },
                // Alineamos la TABLA entera al centro de la página
                alignment: 'center',
                layout: 'noBorders',
              },

              // 2. LOGOS DE MARCAS (Debajo)
              imagenes.logoMarcas
                ? {
                    image: imagenes.logoMarcas,
                    width: 500,
                    alignment: 'center',
                    margin: [0, 0, 0, 5], // Espacio entre el texto de arriba y la imagen
                  }
                : null,
            ],
          };
        },
      };
      // 3. Crear y Abrir PDF
      const pdfDoc = pdfMake.createPdf(docDefinition);
      // Genera el nombre del archivo usando el folio para que sea ordenado
      const nombreArchivo = `CC_CA00000${data.folio}.pdf`;
      const folio = `${data.folio}`;

      return new Promise((resolve, reject) => {
        try {
          pdfDoc.getBase64().then((base64: any) => {
            resolve({ base64, nombreArchivo, folio });
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error al generar el PDF: ', error);
      return error;
    }
  }
  // --- UTILIDADES ---

  // Convierte imagen local a Base64
  private async getBase64ImageFromAssets(url: string): Promise<string> {
    try {
      console.log(`Cargando imagen: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `Imagen no encontrada: ${url}, status: ${response.status}`,
        );
        return ''; // Retorna vacío para no romper el PDF si falta una imagen
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log(`Imagen cargada exitosamente: ${url}`);
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.error(`Error al leer imagen ${url}:`, error);
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn(`No se pudo cargar la imagen: ${url}`, e);
      return ''; // Retorna vacío para no romper el PDF si falta una imagen
    }
  }

  private async cargarImagenesPdf() {
    const [logoCabs, logoBni, logoMarcas, iconWhats] = await Promise.all([
      this.getBase64ImageFromAssets('/pdf-img/CABS-logo.png'),
      this.getBase64ImageFromAssets('/pdf-img/yosoybni.png'),
      this.getBase64ImageFromAssets('/pdf-img/marcas.png'),
      this.getBase64ImageFromAssets('/pdf-img/whats.jpg'),
    ]);

    return { logoCabs, logoBni, logoMarcas, iconWhats };
  }

  // Formato de moneda simple
  private formatMoney(amount: number): string {
    return '' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  /**
   * Convierte un número a su representación en texto para facturación (México)
   * Ejemplo: 150.50 -> "CIENTO CINCUENTA PESOS 50/100 M.N."
   */
  private numeroALetras(importe: number): string {
    const value = Math.abs(importe); // Asegurar positivo
    const entero = Math.floor(value);
    const centavos = Math.round((value - entero) * 100);
    const centavosStr = centavos.toString().padStart(2, '0');

    let letras = '';

    if (entero === 0) letras = 'CERO';
    else if (entero === 1)
      letras = 'UN'; // Caso especial para moneda
    else letras = this.convertirGrupo(entero);

    // Formato estándar facturación México
    const moneda = entero === 1 ? 'PESO' : 'PESOS';
    return `${letras} ${moneda} ${centavosStr}/100 M.N.`;
  }

  private generarDocDefinition(
    data: CotizacionPDF,
    imagenes: any,
    textoTotal: string,
  ): any {
    return {
      pageSize: 'LETTER',
      pageMargins: [30, 250, 30, 90],
      styles: this.obtenerEstilos(),
      images: {
        logoCabs: imagenes.logoCabs,
        logoBni: imagenes.logoBni,
        iconWhats: imagenes.iconWhats,
        logoMarcas: imagenes.logoMarcas,
      },
      // ==========================================
      // ENCABEZADO FIJO (Header)
      // ==========================================
      header: (currentPage: number, pageCount: number) => {
        return {
          // Márgenes para alinear el header con el cuerpo de la página
          // [Izq, Top, Der, Bottom] -> 30 a los lados igual que el documento
          margin: [30, 20, 30, 0],
          stack: [
            // 1. LOGOS Y FOLIO
            {
              columns: [
                // COLUMNA 1: Logo CABS
                {
                  width: 'auto',
                  stack: [
                    imagenes.logoCabs
                      ? {
                          image: imagenes.logoCabs,
                          width: 150,
                          alignment: 'left',
                        }
                      : null,
                  ],
                },
                // COLUMNA 2: Logo BNI
                {
                  width: '*',
                  stack: [
                    imagenes.logoBni
                      ? {
                          image: imagenes.logoBni,
                          width: 120,
                          alignment: 'center',
                          margin: [0, 40, 0, 0],
                        }
                      : null,
                  ],
                },
                // COLUMNA 3: Tabla Folio
                {
                  width: 130,
                  layout: 'noBorders',
                  table: {
                    widths: ['*'],
                    body: [
                      [
                        {
                          text: 'Cotización',
                          fillColor: '#cccccc',
                          color: '#1E90FF',
                          bold: true,
                          alignment: 'center',
                          fontSize: 10,
                          margin: [0, 2, 0, 2],
                        },
                      ],
                      [
                        {
                          layout: 'noBorders',
                          margin: [0, 5, 0, 0],
                          table: {
                            widths: [35, '*'],
                            body: [
                              [
                                { text: 'Serie:', fontSize: 8, bold: true },
                                { text: data.serie, fontSize: 8, bold: true },
                              ],
                              [
                                { text: 'Folio:', fontSize: 8, bold: true },
                                { text: data.folio, fontSize: 8, bold: true },
                              ],
                              [
                                { text: 'Fecha:', fontSize: 8, bold: true },
                                { text: data.fecha, fontSize: 8 },
                              ],
                            ],
                          },
                        },
                      ],
                    ],
                  },
                },
              ],
            },

            // 2. DATOS EMPRESA (Barra Azul)
            {
              margin: [0, 0, 0, 0],
              fillColor: '#1E90FF',
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: data.empresa.nombre,
                          fontSize: 16,
                          bold: true,
                          color: 'white',
                        },
                        {
                          text: data.empresa.rfc,
                          fontSize: 12,
                          color: 'white',
                          margin: [0, 2, 0, 5],
                        },
                        {
                          columns: [
                            {
                              text: `Calle: ${data.empresa.direccion}`,
                              fontSize: 10,
                              color: 'white',
                              bold: true,
                            },
                            {
                              text: `Col: ${data.empresa.colonia}`,
                              fontSize: 10,
                              color: 'white',
                              bold: true,
                            },
                          ],
                        },
                        {
                          columns: [
                            {
                              text: `CP/Lugar: ${data.empresa.cpCiudadEstado}`,
                              fontSize: 10,
                              color: 'white',
                            },
                            {
                              text: `Tel: ${data.empresa.telefono}`,
                              fontSize: 10,
                              color: 'white',
                            },
                          ],
                        },
                      ],
                      margin: [5, 5, 5, 5],
                      border: [false, false, false, false],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
            },

            // 3. DATOS DEL CLIENTE
            {
              style: 'boxCliente',
              // Quitamos el margin inferior aquí para que no empuje tanto,
              // el espacio lo dará el pageMargins del documento.
              margin: [0, 0, 0, 0],
              table: {
                widths: [50, '*', 45, '*', 25, 70],
                body: [
                  // Fila 1
                  [
                    { text: 'Cliente:', style: 'labelClient' },
                    {
                      text: data.cliente.nombre,
                      style: 'dataClient',
                      colSpan: 3,
                      bold: true,
                      fontSize: 9,
                    },
                    {},
                    {},
                    {
                      text: 'VIGENCIA COTIZACION',
                      style: 'labelClient',
                      colSpan: 2,
                      alignment: 'center',
                      fontSize: 9,
                    },
                    {},
                  ],
                  // Fila 2
                  [
                    { text: 'RFC:', style: 'labelClient' },
                    {
                      text: data.cliente.rfc,
                      style: 'dataClient',
                      colSpan: 3,
                    },
                    {},
                    {},
                    {
                      text: data.fechaVencimiento,
                      style: 'dataClient',
                      colSpan: 2,
                      alignment: 'center',
                      bold: true,
                      fontSize: 9,
                    },
                    {},
                  ],
                  // Fila 3
                  [
                    { text: 'Domicilio:', style: 'labelClient' },
                    {
                      text: data.cliente.direccion,
                      style: 'dataClient',
                      colSpan: 5,
                    },
                    {},
                    {},
                    {},
                    {},
                  ],
                  // Fila 4
                  [
                    { text: 'Teléfono:', style: 'labelClient' },
                    { text: data.cliente.telefono, style: 'dataClient' },
                    { text: 'Colonia:', style: 'labelClient' },
                    { text: data.cliente.colonia, style: 'dataClient' },
                    { text: 'CP:', style: 'labelClient' },
                    { text: data.cliente.cp, style: 'dataClient' },
                  ],
                  // Fila 5
                  [
                    { text: 'Localidad:', style: 'labelClient' },
                    { text: data.cliente.ciudad, style: 'dataClient' },
                    { text: 'Estado:', style: 'labelClient' },
                    { text: 'Durango', style: 'dataClient' },
                    { text: 'Pais:', style: 'labelClient' },
                    { text: 'México', style: 'dataClient' },
                  ],
                ],
              },
              layout: {
                hLineWidth: (i: number, node: any) =>
                  i === 0 || i === node.table.body.length ? 2 : 0,
                vLineWidth: (i: number, node: any) =>
                  i === 0 || i === node.table.widths.length ? 2 : 0,
                hLineColor: () => '#1E90FF',
                vLineColor: () => '#1E90FF',
                paddingLeft: (i: number) => (i === 0 ? 5 : 2),
                paddingRight: (i: number, node: any) =>
                  i === node.table.widths.length - 1 ? 5 : 2,
                paddingTop: (i: number) => 0,
                paddingBottom: (i: number) => 0,
              },
            },
          ],
        };
      },
      content: [
        // ==========================================
        // 4. TABLA DE PRODUCTOS (Simplificada)
        // ==========================================
        {
          margin: [0, 0, 0, 10],
          stack: [
            {
              table: {
                headerRows: 1,
                // Mantengo tus 8 columnas
                widths: [40, 30, '*', 50, 35, 45, 35, 55],

                // --- CUERPO DE LA TABLA ---
                body: this.construirTablaProductos(data.productos),
              },

              // --- ESTILOS DE BORDES (Layout Limpio) ---
              layout: {
                // Colores: Azul exterior (#1E90FF), Negro interior
                hLineColor: (i: number, node: any) =>
                  i === 0 || i === node.table.body.length ? '#1E90FF' : 'black',
                vLineColor: (i: number, node: any) =>
                  i === 0 || i === node.table.widths.length
                    ? '#1E90FF'
                    : 'black',

                // Grosor: 2px exterior, 1px interior
                hLineWidth: (i: number, node: any) =>
                  i === 0 || i === node.table.body.length ? 2 : 1,
                vLineWidth: (i: number, node: any) =>
                  i === 0 || i === node.table.widths.length ? 2 : 1,

                // Cabecera Gris
                fillColor: (rowIndex: number) =>
                  rowIndex === 0 ? '#808080' : null,

                // Padding
                paddingLeft: (i: number) => 4,
                paddingRight: (i: number) => 4,
                paddingTop: (i: number) => 2,
                paddingBottom: (i: number) => 2,
              },
            },
          ],
        },

        // ==========================================
        // 5. TOTALES (Bloque Indivisible)
        // ==========================================
        {
          // PROPIEDAD CLAVE: Si no cabe completo, salta a la siguiente página.
          unbreakable: true,

          stack: [
            {
              margin: [0, 5, 0, 0],
              columns: [
                // COLUMNA IZQUIERDA: Importe con Letra (Estilo Caja) y Condiciones
                {
                  width: '*',
                  stack: [
                    // Importe con Letra: Simulando la caja azul y gris
                    {
                      table: {
                        widths: ['*'],
                        body: [
                          [
                            {
                              text: 'Importe con letra',
                              style: 'headerBlueBox',
                              alignment: 'center',
                            },
                          ],
                          [
                            {
                              text: textoTotal,
                              style: 'textLetra',
                              alignment: 'center',
                              fillColor: '#e0e0e0',
                            },
                          ],
                        ],
                      },
                      layout: 'noBorders',
                      margin: [0, 0, 10, 10],
                    },
                    // Observaciones / Condiciones
                    {
                      text: '-CONDICIONES DE VENTA:',
                      fontSize: 8,
                      bold: true,
                    },
                    {
                      text: data.observaciones,
                      fontSize: 8,
                      margin: [0, 2, 0, 0],
                    },
                  ],
                },

                // COLUMNA DERECHA: Tabla de Totales
                {
                  width: 170,
                  table: {
                    widths: ['*', 75],
                    body: [
                      [
                        { text: 'Subtotal Ant. Desc.', style: 'labelTotal' },
                        {
                          text: this.formatMoney(data.totales.subtotal),
                          style: 'valTotal',
                        },
                      ],
                      [
                        { text: 'Descuentos', style: 'labelTotal' },
                        {
                          text: this.formatMoney(data.totales.descuento),
                          style: 'valTotal',
                        },
                      ],
                      // Línea de Subtotal calculado
                      [
                        { text: 'Sub-Total', style: 'labelTotal' },
                        {
                          text: this.formatMoney(
                            data.totales.subtotal - data.totales.descuento,
                          ),
                          style: 'valTotal',
                        },
                      ],
                      [
                        { text: 'I.V.A.', style: 'labelTotal' },
                        {
                          text: this.formatMoney(data.totales.iva),
                          style: 'valTotal',
                        },
                      ],

                      // Total Final
                      [
                        {
                          text: 'Total',
                          style: 'labelTotalBig',
                          fillColor: '#cccccc',
                        },
                        {
                          text: this.formatMoney(data.totales.total),
                          style: 'valTotalBig',
                          fillColor: '#cccccc',
                        },
                      ],
                    ],
                  },
                  layout: 'noBorders',
                },
              ],
            },
          ],
        },
      ],
      // Propiedad FOOTER: Esto se repite al final de cada página automáticamente
      footer: (currentPage: number, pageCount: number) => {
        return {
          // Margen superior negativo o ajuste para separarlo del borde
          margin: [30, 0, 30, 20],
          stack: [
            // 1. LÍNEA WHATSAPP + TEXTO (Agrupados y Centrados)
            {
              // TRUCO: Una tabla sin bordes que se ajusta al contenido ('auto')
              // Esto obliga al icono y al texto a estar pegados.
              table: {
                widths: ['17%', '*'],
                body: [
                  [
                    // Celda 1: Icono
                    imagenes.iconWhats
                      ? {
                          image: imagenes.iconWhats,
                          width: 18, // Ligeramente más chico para alinear mejor
                          margin: [0, 2, 0, 0], // [izq, top, der, bot] - 5px a la derecha para separar del texto
                          alignment: 'right', // Alineado a la izq DE SU CELDA
                        }
                      : 'whatsapp',

                    // Celda 2: Texto
                    {
                      text: 'Ahora puedes realizar tus pagos en línea (Solicita informes, Cel: 618 133 27 14)',
                      style: 'footerPromo',
                      alignment: 'left', // Alineado a la izq DE SU CELDA
                      margin: [0, 3, 0, 0], // Ajuste vertical para centrar con el icono
                    },
                  ],
                ],
              },
              // Alineamos la TABLA entera al centro de la página
              alignment: 'center',
              layout: 'noBorders',
            },

            // 2. LOGOS DE MARCAS (Debajo)
            imagenes.logoMarcas
              ? {
                  image: imagenes.logoMarcas,
                  width: 500,
                  alignment: 'center',
                  margin: [0, 0, 0, 5], // Espacio entre el texto de arriba y la imagen
                }
              : null,
          ],
        };
      },
    };
  }

  obtenerEstilos() {
    return {
      labelBold: {
        fontSize: 8,
        bold: true,
        alignment: 'right',
        margin: [0, 2, 0, 2],
      },
      labelClient: {
        fontSize: 8,
        bold: true,
        color: 'black',
        margin: [0, 2, 0, 2],
      },
      dataClient: { fontSize: 8, color: '#333333', margin: [0, 2, 0, 2] },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: 'white',
        alignment: 'center',
        margin: [0, 2, 0, 2],
      },
      tableCell: { fontSize: 8, color: 'black', margin: [0, 2, 0, 2] },
      tableCellP: { fontSize: 8, color: 'black', margin: [0, 0, 0, 0] },
      // Estilo para la barra azul de "Importe con letra"
      headerBlueBox: {
        fontSize: 9,
        bold: true,
        color: 'white',
        fillColor: '#1E90FF',
        margin: [0, 2, 0, 2],
      },
      textLetra: {
        fontSize: 8,
        italics: true,
        bold: true,
        margin: [0, 4, 0, 4],
      },
      labelTotal: {
        fontSize: 8,
        bold: true,
        alignment: 'right',
        margin: [0, 2, 0, 2],
      },
      valTotal: { fontSize: 8, alignment: 'right', margin: [0, 2, 0, 2] },
      labelTotalBig: {
        fontSize: 10,
        bold: true,
        alignment: 'right',
        color: 'black',
        margin: [2, 4, 2, 4],
      },
      valTotalBig: {
        fontSize: 10,
        bold: true,
        alignment: 'right',
        color: 'black',
        margin: [2, 4, 2, 4],
      },
      footerPromo: {
        fontSize: 10,
        bold: true,
        decoration: 'underline',
        color: '#333333',
      },
    };
  }

  private construirTablaProductos(productos: any[]): any[] {
    // 1. Cabecera
    const rows: any[] = [
      [
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Unidad', style: 'tableHeader' },
        { text: 'Descripción', style: 'tableHeader' },
        { text: 'Precio Unit.', style: 'tableHeader' },
        { text: '% Desc', style: 'tableHeader' },
        { text: 'Imp. Desc', style: 'tableHeader' },
        { text: 'IVA', style: 'tableHeader' },
        { text: 'Importe', style: 'tableHeader' },
      ],
    ];

    // 2. Mapeo de Productos (Filas de datos)
    productos.forEach((p) => {
      rows.push([
        {
          text: p.cantidad,
          style: 'tableCell',
          alignment: 'center',
        },
        {
          text: p.unidad,
          style: 'tableCell',
          alignment: 'center',
        },
        // Descripción con Observaciones
        {
          stack: [
            { text: p.descripcion, style: 'tableCellP' },
            p.observaciones
              ? {
                  margin: [0, 0, 0, 0],
                  table: {
                    widths: ['100%'],
                    body: [
                      [
                        {
                          text: p.observaciones,
                          fontSize: 7,
                          border: [true, true, true, true],
                          borderColor: ['black', 'black', 'black', 'black'],
                        },
                      ],
                    ],
                  },
                  layout: 'noBorders',
                }
              : null,
          ],
        },
        {
          text: this.formatMoney(p.precioUnitario),
          style: 'tableCell',
          alignment: 'right',
        },
        {
          text: p.porcDescuento > 0 ? p.porcDescuento + '%' : '',
          style: 'tableCell',
          alignment: 'right',
        },
        {
          text:
            p.importeDescuento > 0 ? this.formatMoney(p.importeDescuento) : '',
          style: 'tableCell',
          alignment: 'right',
        },
        {
          text: this.formatMoney(p.importeIVA),
          style: 'tableCell',
          alignment: 'right',
        },
        {
          text: this.formatMoney(p.total),
          style: 'tableCell',
          alignment: 'right',
          bold: true,
        },
      ]);
    });

    // ¡Listo! Sin relleno, solo devolvemos las filas reales.
    return rows;
  }

  private construirTablaProductosSinIVA(productos: any[]): any[] {
    const rows: any[] = [
      [
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Unidad', style: 'tableHeader' },
        { text: 'Descripción', style: 'tableHeader' },
        { text: 'Importe', style: 'tableHeader' },
      ],
    ];

    // 2. Mapeo de Productos
    productos.forEach((p) => {
      rows.push([
        {
          text: p.cantidad,
          style: 'tableCell',
          alignment: 'center',
        },
        {
          text: p.unidad,
          style: 'tableCell',
          alignment: 'center',
        },
        {
          stack: [
            { text: p.descripcion, style: 'tableCellP' },
            p.observaciones
              ? {
                  margin: [0, 2, 0, 0],
                  table: {
                    widths: ['100%'],
                    body: [
                      [
                        {
                          text: p.observaciones,
                          fontSize: 7,
                          border: [true, true, true, true],
                          borderColor: ['black', 'black', 'black', 'black'],
                        },
                      ],
                    ],
                  },
                  layout: 'noBorders',
                }
              : null,
          ],
        },
        {
          text: this.formatMoney(p.total),
          style: 'tableCell',
          alignment: 'right',
          bold: true,
        },
      ]);
    });

    return rows;
  }
  // Lógica recursiva para grupos de números
  private convertirGrupo(n: number): string {
    const unidades = [
      '',
      'UN',
      'DOS',
      'TRES',
      'CUATRO',
      'CINCO',
      'SEIS',
      'SIETE',
      'OCHO',
      'NUEVE',
    ];
    const decenas = [
      '',
      'DIEZ',
      'VEINTE',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA',
    ];
    const centenas = [
      '',
      'CIENTO',
      'DOSCIENTOS',
      'TRESCIENTOS',
      'CUATROCIENTOS',
      'QUINIENTOS',
      'SEISCIENTOS',
      'SETECIENTOS',
      'OCHOCIENTOS',
      'NOVECIENTOS',
    ];
    const especiales = [
      'DIEZ',
      'ONCE',
      'DOCE',
      'TRECE',
      'CATORCE',
      'QUINCE',
      'DIECISÉIS',
      'DIECISIETE',
      'DIECIOCHO',
      'DIECINUEVE',
    ];

    if (n === 0) return '';

    // Millones
    if (n >= 1000000) {
      const miles = Math.floor(n / 1000000);
      const resto = n % 1000000;
      const sufijo = miles === 1 ? ' MILLÓN' : ' MILLONES';
      // "UN MILLÓN" vs "DOS MILLONES"
      const prefijo = miles === 1 ? 'UN' : this.convertirGrupo(miles);
      return (
        prefijo +
        sufijo +
        (resto > 0 ? ' ' + this.convertirGrupo(resto) : '')
      ).trim();
    }

    // Miles
    if (n >= 1000) {
      const miles = Math.floor(n / 1000);
      const resto = n % 1000;
      // "MIL" vs "DOS MIL" (No se dice "UN MIL")
      const prefijo = miles === 1 ? '' : this.convertirGrupo(miles) + ' ';
      return (
        prefijo +
        'MIL' +
        (resto > 0 ? ' ' + this.convertirGrupo(resto) : '')
      ).trim();
    }

    // Centenas
    if (n >= 100) {
      if (n === 100) return 'CIEN'; // Caso especial exacto
      const c = Math.floor(n / 100);
      const resto = n % 100;
      return (
        centenas[c] + (resto > 0 ? ' ' + this.convertirGrupo(resto) : '')
      ).trim();
    }

    // Decenas y Unidades
    if (n >= 20) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      if (n === 20) return 'VEINTE';
      // Caso especial VEINTI... (21-29)
      if (n > 20 && n < 30) {
        const veinti = [
          'VEINTIÚN',
          'VEINTIDÓS',
          'VEINTITRÉS',
          'VEINTICUATRO',
          'VEINTICINCO',
          'VEINTISÉIS',
          'VEINTISIETE',
          'VEINTIOCHO',
          'VEINTINUEVE',
        ];
        // Nota: Usamos VEINTIÚN porque precede a "PESOS" (masculino)
        if (u === 1) return 'VEINTIÚN';
        return `VEINTI${unidades[u]}`;
      }

      // 30 en adelante
      let str = decenas[d];
      if (u > 0) {
        str += ` Y ${u === 1 ? 'UN' : unidades[u]}`; // "TREINTA Y UN"
      }
      return str;
    }

    // 10 - 19
    if (n >= 10) {
      return especiales[n - 10];
    }

    // 0 - 9
    return n === 1 ? 'UN' : unidades[n];
  }

  /**
   * Envía la cotización por correo utilizando el backend (Server-Side generation)
   */
  async enviarCorreoCotizacion(
    Emails: string[],
    Nombre: string,
    Asunto: string,
    pdfbase64: string,
    NombreArchivo: string,
    Folio: string,
  ) {
    const url = `${this.apiUrl}/enviar`;

    // SOLUCIÓN: Las claves de este objeto deben ir en minúscula (camelCase)
    // para que .NET las reconozca y mapee automáticamente a tu DTO.
    const payload = {
      Emails: Emails,
      Nombre: Nombre || 'Cliente',
      Asunto: Asunto || 'Envio de Cotizacion',
      PdfFile: pdfbase64,
      NombreArchivo: NombreArchivo,
      Folio: Folio,
    };

    console.log('Payload a enviar:', payload);

    return await firstValueFrom(
      this.http.post<any>(url, payload, { withCredentials: true }),
    );
  }
}
