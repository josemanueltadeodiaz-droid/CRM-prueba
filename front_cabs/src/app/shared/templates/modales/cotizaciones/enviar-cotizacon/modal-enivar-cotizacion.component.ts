import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UiBotonComponent } from '../../../../atoms/boton/boton.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UiHeaderModal } from '../../../../molecules/headerModal/header-modal.component';
import { TabsNavegacion } from '../../../../molecules/tabsNavegacion/tabsNavegacion.component';
import { UitipografiaComponent } from '../../../../~exports/detail-view.index';

// Servicios
import { ExportService } from '../../../../../core/services/export.service';
import { CotizacionPDF } from '../../../../../core/models/cotizacion-legacy.interface';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { UnidadLegacyService } from '../../../../../core/services/unidad-legacy.service';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

export interface ModalEnviarCotizacionData {
  idCotizacion: number;
  cliente?: any;
  cotizacion?: any;
}

interface PdfResponse {
  base64: string;
  nombreArchivo: string;
  folio: string;
}
@Component({
  selector: 'app-modal-enviar-cotizacion', 
  standalone: true,
  imports: [
    UitipografiaComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    UiBotonComponent,
    UiHeaderModal,
    TabsNavegacion,
  ],
  templateUrl: './modal-enviar-cotizacion.component.html',
})
export class ModalEnivarCotizacion {
  // --- CONFIGURACIÓN DE PESTAÑAS ---
  tabActivo: string = 'Tipo-de-envio';
  tabsConfig = [
    {
      id: 'Tipo-de-envio',
      nombreTab: 'Tipo de envio',
      ruta: '#',
      habilitado: true,
    },
    {
      id: 'Personalizado',
      nombreTab: 'Personalizado',
      ruta: '#',
      habilitado: true,
    },
  ];

  // --- DATOS DEL COMPONENTE ---
  idCotizacion: number = 0;
  cliente: any = null;
  cotizacion: any = null;

  // Estado de carga
  generandoPdf: boolean = false;
  enviandoEmail: boolean = false;

  // --- MODELO DE SELECCIÓN ---

  // Lista de correos (Se llenará con datos del cliente + defaults)
  correosDisponibles: Array<{ id: string; label: string; email: string }> = [];

  seleccion = {
    // Pestaña 1: Ahora es una lista de emails seleccionados
    emailsSeleccionados: [] as string[], // ID del correo seleccionado en la lista
    iva: 'conIVA', // 'conIVA' | 'sinIVA'

    // Pestaña 2: Personalizado
    medioPersonalizado: 'correo', // 'whatsapp' | 'correo'
    ivaPersonalizado: 'conIVA',

    // Inputs de texto para personalizado
    inputCorreoPersonalizado: '',
    inputWhatsappPersonalizado: '',
  };

  constructor(
    public dialogRef: MatDialogRef<ModalEnivarCotizacion>,
    @Inject(MAT_DIALOG_DATA) public data: ModalEnviarCotizacionData,
    private exportService: ExportService,
    private clienteService: ClienteLegacyService,
    private unidadMedidaService: UnidadLegacyService,
  ) {
    // 1. Inicializar datos base
    if (data) {
      this.idCotizacion = data.idCotizacion || 0;
      this.cliente = data.cliente || null;
      this.cotizacion = data.cotizacion || null;
      console.log(this.cliente, this.cotizacion, this.idCotizacion);
    }

    // 2. Cargar correos disponibles basados en el cliente
    this.inicializarCorreos();
  }

  /**
   * Genera la lista de correos basándose en la información del cliente
   */
  private inicializarCorreos() {
    this.correosDisponibles = [];

    // Si hay email principal en el cliente
    if (this.cliente?.email) {
      this.correosDisponibles.push({
        id: 'c_principal',
        label: 'Correo Principal',
        email: this.cliente.email,
      });
    }
    if (this.cliente?.email2) {
      this.correosDisponibles.push({
        id: 'c_principal2',
        label: 'Correo Principal 2',
        email: this.cliente.email2,
      });
    }
    if (this.cliente?.email3) {
      this.correosDisponibles.push({
        id: 'c_principal3',
        label: 'Correo Principal 3',
        email: this.cliente.email3,
      });
    }
    // Si hay email en detalles de ubicación (ejemplo)
    if (
      this.cliente?.ubicacionDetalle?.email &&
      this.cliente.ubicacionDetalle.email !== this.cliente.email
    ) {
      this.correosDisponibles.push({
        id: 'c_ubicacion',
        label: 'Correo Ubicación',
        email: this.cliente.ubicacionDetalle.email,
      });
    }

    // Seleccionar el primero por defecto (ahora agregándolo al arreglo)
    if (this.correosDisponibles.length > 0) {
      // En lugar de asignar un string, hacemos un push al arreglo de selección múltiple
      this.seleccion.emailsSeleccionados = [this.correosDisponibles[0].email];
    }
  }

  // --- LÓGICA DE INTERACCIÓN (Tabs & Cierre) ---

  cambiarTab(tabId: string): void {
    this.tabActivo = tabId;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  // --- SETTERS PARA EL HTML ---

  seleccionarCorreoLista(email: string) {
    const index = this.seleccion.emailsSeleccionados.indexOf(email);
    if (index > -1) {
      // Si ya existe, lo quitamos
      this.seleccion.emailsSeleccionados.splice(index, 1);
    } else {
      // Si no existe, lo agregamos (limitando a 5 si quieres ser estricto)
      if (this.seleccion.emailsSeleccionados.length < 5) {
        this.seleccion.emailsSeleccionados.push(email);
      } else {
        Swal.fire('Límite', 'Puedes seleccionar hasta 5 correos.', 'info');
      }
    }
  }

  seleccionarTipoIVA(valor: string) {
    this.seleccion.iva = valor;
  }

  // Métodos para personalizado
  seleccionarMedioPersonalizado(medio: string) {
    this.seleccion.medioPersonalizado = medio;
  }

  seleccionarTipoIVAPersonalizado(valor: string) {
    this.seleccion.ivaPersonalizado = valor;
  }

  // --- GETTERS DE ESTILOS (Actualizados para la lista) ---

  /**
   * Estilo para tarjetas de la lista de correos (Pestaña 1)
   */
  getStyleCorreoLista(email: string): string {
    const isSelected = this.isCorreoChecked(email);
    return this.getBaseCardStyle(isSelected);
  }

  /**
   * Estilo para opciones generales (IVA, Medios Personalizados)
   */
  getStyleGeneral(
    grupo: 'iva' | 'medioPersonalizado' | 'ivaPersonalizado',
    valor: string,
  ): string {
    let isSelected = false;

    if (grupo === 'iva') isSelected = this.seleccion.iva === valor;
    if (grupo === 'medioPersonalizado')
      isSelected = this.seleccion.medioPersonalizado === valor;
    if (grupo === 'ivaPersonalizado')
      isSelected = this.seleccion.ivaPersonalizado === valor;

    return this.getBaseCardStyle(isSelected);
  }

  /**
   * Helper para devolver las clases CSS comunes
   */
  private getBaseCardStyle(isSelected: boolean): string {
    const base =
      'relative flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 select-none w-full';
    const active = 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600';
    const inactive = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
    return `${base} ${isSelected ? active : inactive}`;
  }

  /**
   * Helper para verificar si un correo está chequeado visualmente
   */
  isCorreoChecked(email: string): boolean {
    return this.seleccion.emailsSeleccionados.includes(email);
  }

  // --- LÓGICA DE ENVÍO PRINCIPAL ---

  async enviarCotizacion(): Promise<void> {
    try {
      this.enviandoEmail = true; // Feedback visual de carga
      let listaDestinatarios: string[] = [];
      let ivaFinal = '';

      if (this.tabActivo === 'Tipo-de-envio') {
        ivaFinal = this.seleccion.iva;
        listaDestinatarios = [...this.seleccion.emailsSeleccionados];

        if (listaDestinatarios.length === 0) {
          Swal.fire(
            'Atención',
            'Selecciona al menos un destinatario.',
            'warning',
          );
          return;
        }
      } else {
        // Pestaña Personalizado
        ivaFinal = this.seleccion.ivaPersonalizado;
        const emailPers = this.seleccion.inputCorreoPersonalizado.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailPers)) {
          Swal.fire('Error', 'El correo personalizado no es válido.', 'error');
          return;
        }
        listaDestinatarios = [emailPers];
      }

      // --- GENERACIÓN DEL PDF ---
      const datos = await this.prepararDatosParaPdf();
      const pdf = (
        ivaFinal === 'sinIVA'
          ? await this.exportService.generarBase64SinIVACotizacion(datos)
          : await this.exportService.generarBse64CotizacionCI(datos)
      ) as PdfResponse;

      // --- NOMBRE DEL CLIENTE ---
      const nombreCliente =
        this.cliente.id === 832
          ? this.cotizacion.razonSocial
          : this.cliente.nombre;
      const datosEnvio = {
        listaDestinatarios,
        nombre: `${nombreCliente}`,
        asunto: 'Envio de Cotizacion',
        pdfBase64: `${pdf.base64}`,
        nombreArchivo: `${pdf.nombreArchivo}`,
        folio: `${pdf.folio}`,
      };
      // --- LLAMADA AL SERVICIO (Asegúrate que exportService acepte Array<string>) ---
      const response = await this.exportService.enviarCorreoCotizacion(
        listaDestinatarios, // <--- Enviamos el array completo
        nombreCliente,
        'Envío de Cotización',
        pdf.base64,
        pdf.nombreArchivo,
        pdf.folio,
      );

      if (response.exitoso) {
        await Swal.fire(
          'Enviado',
          'La cotización se envió correctamente.',
          'success',
        );
        this.dialogRef.close({ success: true });
      } else {
        throw new Error(response.mensaje);
      }
    } catch (error: any) {
      console.error('Error:', error);
      Swal.fire(
        'Error',
        error.message || 'No se pudo enviar el correo',
        'error',
      );
    } finally {
      this.enviandoEmail = false;
    }
  }

  // --- SERVICIOS Y HELPERS ---

  // --- GENERACIÓN PDF (Sin cambios mayores, solo llamadas) ---

  async generarPdfConIVA(): Promise<void> {
    this.generandoPdf = true;
    try {
      const datos = await this.prepararDatosParaPdf();
      await this.exportService.generarPdfCotizacion(datos);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      this.generandoPdf = false;
    }
  }

  async generarPdfSinIVA(): Promise<void> {
    this.generandoPdf = true;
    try {
      const datos = await this.prepararDatosParaPdf();
      await this.exportService.generarPdfSinIVACotizacion(datos);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      this.generandoPdf = false;
    }
  }

  // --- HELPERS DE DATOS ---

  getTelefonoCliente(): string {
    return this.cliente?.telefono || 'Sin registro';
  }

  getEmailCliente(): string {
    return this.cliente?.email || 'Sin registro';
  }

  // Lógica compleja de preparación de datos PDF se mantiene igual...
  private async prepararDatosParaPdf(): Promise<CotizacionPDF> {
    try {
      // 1. Desempaquetar Signals (o getters) UNA sola vez por rendimiento
      const data = this.cotizacion;
      const clienteData = this.cliente;
      console.log(data);
      console.log(clienteData);
      // 2. Calcular Teléfono del Cliente
      let telefonoCalculado = 'Sin teléfono';

      if (clienteData) {
        if (clienteData.telefono) {
          telefonoCalculado = clienteData.telefono;
        } else if (clienteData.ubicacionDetalle) {
          const ud = clienteData.ubicacionDetalle;
          telefonoCalculado =
            ud.telefono1 ||
            ud.telefono2 ||
            ud.telefonoCompleto ||
            'Sin teléfono';
        }
      }

      // 3. Obtener Unidades de Medida
      const movimientos: any[] = data?.movimientos || [];

      // Filtro seguro: Asegura que exista el idUnidad y sea mayor a 0
      const uniqueUnitIds = [
        ...new Set(
          movimientos
            .map((m) => m.idUnidad)
            .filter((id) => id != null && id > 0),
        ),
      ];

      const unitMap = new Map<number, string>();

      // Promise.allSettled es más seguro que Promise.all.
      // Si falla obtener una unidad, no detendrá todo el PDF, simplemente usará 'PZA' como fallback.
      if (uniqueUnitIds.length > 0) {
        await Promise.allSettled(
          uniqueUnitIds.map(async (id) => {
            try {
              const resp = await firstValueFrom(
                this.unidadMedidaService.obtenerPorId(id),
              );
              if (resp?.success && resp?.data) {
                unitMap.set(id, resp.data.abreviatura);
              }
            } catch (e) {
              console.warn(`Aviso: No se pudo obtener la unidad ${id}`, e);
            }
          }),
        );
      }

      // 4. Calcular totales auxiliares
      const totalDescuentosDoc =
        (data?.descuentoDoc1 ?? 0) +
        (data?.descuentoDoc2 ?? 0) +
        (data?.descuentoDoc3 ?? 0);

      // 5. Mapeo de datos usando la interfaz
      const datosParaPdf: CotizacionPDF = {
        serie: data?.serieDocumento || 'CA', // Eliminado el template string innecesario
        folio: String(data?.folio ?? 0),
        fecha: this.formatDate(data?.fecha),
        fechaVencimiento: data?.fechaVencimiento
          ? this.formatDate(data.fechaVencimiento)
          : 'N/A',

        empresa: {
          // TODO: Estos datos NO vienen en CotizacionLegacyResponse.
          nombre: 'CABS COMPUTACION DGO SA DE CV',
          rfc: 'CCD123456XYZ',
          direccion: 'Calle Beatriz Prado #123',
          colonia: 'Benjamín Méndez',
          cpCiudadEstado: '34020, Victoria de Durango, Durango',
          telefono: '6188111371',
        },

        cliente: {
          nombre:
            data?.razonSocial || clienteData?.nombre || 'Público en General', // Fallback mejorado
          rfc: clienteData?.rfc || '',

          direccion: `${clienteData?.ubicacionDetalle?.calle || ''} ${
            clienteData?.ubicacionDetalle?.numeroExterior || ''
          }`.trim(),
          colonia: clienteData?.ubicacionDetalle?.colonia || '',
          cp: clienteData?.ubicacionDetalle?.codigoPostal || '',
          ciudad:
            clienteData?.ubicacionDetalle?.ciudad ||
            clienteData?.ubicacionDetalle?.municipio ||
            '',
          telefono: telefonoCalculado,
        },

        // Mapeo de Movimientos
        productos: movimientos.map((mov) => ({
          cantidad: mov.unidadesCapturadas ?? 0,
          unidad: unitMap.get(mov.idUnidad) || 'PZA',
          descripcion: mov.nombreProducto || 'Producto sin nombre',
          precioUnitario: mov.precioCapturado ?? 0,
          porcDescuento: mov.porcentajeDescuento ?? 0,
          importeDescuento: mov.descuentoLinea ?? 0,
          importe: mov.neto ?? 0,
          observaciones: mov.observaciones || '',
          importeIVA: mov.impuesto1 ?? 0,
          total: mov.total ?? 0,
        })),

        totales: {
          subtotal: data?.subtotal ?? 0,
          descuento: totalDescuentosDoc,
          iva: data?.iva ?? 0,
          total: data?.total ?? 0,
          totalLetra: '', // Asegúrate de que tu generador PDF maneje este campo
        },

        observaciones: data?.observaciones || '',
      };

      return datosParaPdf;
    } catch (error) {
      console.error('Error preparando datos para el PDF:', error);
      throw new Error('Fallo al estructurar los datos del documento.');
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    // Ajuste para evitar problemas de zona horaria si la fecha viene como ISO sin hora (YYYY-MM-DD)
    // Se añade 'T00:00:00' si es necesario o se parsea como string directo
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Si falla el parseo, retorna el string original

    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
