// =====================================================================================
// DOCUMENTOS COMPONENT - Versión con UiAlertComponent
// =====================================================================================
import {
  Component,
  OnInit,
  signal,
  computed,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CotizacionLegacyService } from '../../../../core/services/cotizacion-legacy.service';
import { ClienteLegacyService } from '../../../../core/services/cliente-legacy.service';
import { UnidadLegacyService } from '../../../../core/services/unidad-legacy.service';
import { ExportService } from '../../../../core/services/export.service';
import {
  CotizacionLegacyResponse,
  CotizacionLegacyFiltros,
  CotizacionPDF,
} from '../../../../core/models/cotizacion-legacy.interface';
import { DialogVistaDocumentosComponent } from './dialog.vista-documentos/dialog.vista-documentos.component';
import { UiDialogAlertComponent } from '../../../../shared/organisms/dialogAlert/dialogAlert.component';

// Importar componentes reutilizables
import { UiHeaderComponent } from '../../../../shared/molecules/header/header.component';
import { UiInputComponent } from '../../../../shared/molecules/input/input.component';
import {
  UitipografiaComponent,
  UiBotonComponent,
} from '../../../../shared/~exports/detail-view.index';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';
import { UiAlertComponent } from '../../../../shared/~exports/detail-view.index';

type TipoAlerta = 'eliminar' | 'advertencia' | 'aprovado';

interface Notificacion {
  tipo: 'success' | 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  duracion?: number; // en milisegundos
}

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogVistaDocumentosComponent,
    UiDialogAlertComponent,
    UiAlertComponent,
    // Componentes reutilizables
    UiHeaderComponent,
    UiInputComponent,
    UitipografiaComponent,
    UiBotonComponent,
    UiIconComponent,
  ],
  templateUrl: './documentos.component.html',
})
export class DocumentosComponent implements OnInit {
  // Referencia al componente de alerta
  @ViewChild('notificacionAlert') notificacionAlert!: UiAlertComponent;

  // Exponer Math para el template
  Math = Math;

  // Variables para los filtros en el template
  textoBusqueda: string = '';
  estadoSeleccionado: number | string = '';
  serieSeleccionada: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';

  menuAbiertoId = signal<number | null>(null);
  generandoPdf = signal<boolean>(false);

  // Notificaciones
  notificacion = signal<Notificacion | null>(null);
  mostrarNotificacion = signal<boolean>(false);

  // Filtros temporales (se aplican solo al hacer clic en "Buscar")
  filtrosTemporales = signal({
    texto: '',
    estado: '' as number | string,
    serie: '' as string,
    fechaInicio: '',
    fechaFin: '',
  });

  opcionesEstados = [
    { value: '', label: 'Todos los estados' },
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Cancelado' },
  ];

  tipoSeleccionado = [
    { value: '', label: 'Cotizaciones' },
    { value: 'A4', label: 'Facturas' },
    { value: 'CIN', label: 'Ordenes de Compra' },
  ];
  // Signals para estado reactivo
  cotizaciones = signal<CotizacionLegacyResponse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Resumen
  resumenTotal = signal<number>(0);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  totalRecords = signal<number>(0);
  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  // Filtros de búsqueda (se envían al servicio)
  filtros: CotizacionLegacyFiltros = {
    page: 1,
    pageSize: 20,
    incluirMovimientos: false,
  };

  // Modal states
  showDetailModal = signal<boolean>(false);
  idDocumentoSeleccionado = signal<number>(0);

  // Signals para alertas
  mostrarAlertaCancelacion = signal<boolean>(false);
  mostrarAlertaEliminacion = signal<boolean>(false);
  tipoAlerta = signal<TipoAlerta>('eliminar');
  motivoCancelacion = signal<string>('');
  loadingCancelacion = signal<boolean>(false);
  loadingEliminacion = signal<boolean>(false);
  errorMotivo = signal<string>('');
  idDocumentoParaAccion = signal<number>(0);

  constructor(
    private cotizacionService: CotizacionLegacyService,
    private clienteService: ClienteLegacyService,
    private unidadMedidaService: UnidadLegacyService,
    private exportService: ExportService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Inicializar fechas por defecto (último mes)
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);

    this.fechaInicio = fechaInicio.toISOString().split('T')[0];
    this.fechaFin = fechaFin.toISOString().split('T')[0];

    // Inicializar filtros con las fechas por defecto
    this.filtros.fechaInicio = this.fechaInicio;
    this.filtros.fechaFin = this.fechaFin;

    this.cargarCotizaciones();
    this.cargarResumen();
  }

  // ==================== MÉTODOS DE NOTIFICACIÓN ====================

  /**
   * Muestra una notificación usando UiAlertComponent
   */
  mostrarNotificacionExito(mensaje: string, titulo: string = '¡Éxito!'): void {
    this.notificacion.set({
      tipo: 'success',
      titulo: titulo,
      mensaje: mensaje,
      duracion: 3000,
    });
    this.mostrarNotificacion.set(true);

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      this.mostrarNotificacion.set(false);
      this.notificacion.set(null);
    }, 3000);
  }

  mostrarNotificacionError(mensaje: string, titulo: string = 'Error'): void {
    this.notificacion.set({
      tipo: 'error',
      titulo: titulo,
      mensaje: mensaje,
      duracion: 4000,
    });
    this.mostrarNotificacion.set(true);

    setTimeout(() => {
      this.mostrarNotificacion.set(false);
      this.notificacion.set(null);
    }, 4000);
  }

  mostrarNotificacionAdvertencia(
    mensaje: string,
    titulo: string = 'Advertencia',
  ): void {
    this.notificacion.set({
      tipo: 'warning',
      titulo: titulo,
      mensaje: mensaje,
      duracion: 3500,
    });
    this.mostrarNotificacion.set(true);

    setTimeout(() => {
      this.mostrarNotificacion.set(false);
      this.notificacion.set(null);
    }, 3500);
  }

  mostrarNotificacionInfo(
    mensaje: string,
    titulo: string = 'Información',
  ): void {
    this.notificacion.set({
      tipo: 'info',
      titulo: titulo,
      mensaje: mensaje,
      duracion: 3000,
    });
    this.mostrarNotificacion.set(true);

    setTimeout(() => {
      this.mostrarNotificacion.set(false);
      this.notificacion.set(null);
    }, 3000);
  }

  cerrarNotificacion(): void {
    this.mostrarNotificacion.set(false);
    this.notificacion.set(null);
  }

  // ==================== CARGA DE DATOS ====================

  cargarResumen(): void {
    // Calcular rango de fechas (último mes)
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    this.cotizacionService
      .obtenerResumen(formatDate(fechaInicio), formatDate(fechaFin))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.resumenTotal.set(response.data.totalDocumentos);
          }
        },
        error: (err) => {
          console.error('Error al cargar resumen:', err);
          this.mostrarNotificacionError('No se pudo cargar el resumen');
        },
      });
  }

  cargarCotizaciones(): void {
    this.loading.set(true);
    this.error.set(null);

    this.filtros.page = this.currentPage();
    this.filtros.pageSize = this.pageSize();

    console.log('Filtros aplicados al servicio:', this.filtros);

    this.cotizacionService.buscar(this.filtros).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cotizaciones.set(response.data.data || []);

          if (response.data.pagination) {
            this.totalRecords.set(response.data.pagination.totalRecords);
          } else {
            this.totalRecords.set(response.data.data?.length || 0);
          }
        } else {
          this.error.set(response.message || 'No se pudieron cargar los datos');
          this.mostrarNotificacionError(
            response.message || 'Error al cargar cotizaciones',
          );
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.mensaje || 'Error al cargar cotizaciones');
        this.loading.set(false);
        this.mostrarNotificacionError(
          err.mensaje || 'Error al cargar cotizaciones',
        );
      },
    });
  }

  // ==================== MÉTODOS DE FILTRADO ====================

  aplicarFiltros(): void {
    console.log('Aplicando filtros...');

    const textoBusqueda = this.textoBusqueda.trim();

    // Guardar los filtros actuales en las variables temporales
    this.filtrosTemporales.set({
      texto: textoBusqueda,
      estado: this.estadoSeleccionado,
      serie: this.serieSeleccionada,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
    });

    // Crear nuevos filtros basados en los temporales
    const nuevosFiltros: CotizacionLegacyFiltros = {
      page: 1,
      pageSize: this.pageSize(),
      incluirMovimientos: false,
    };

    // Aplicar búsqueda por folio o cliente
    if (textoBusqueda) {
      if (/^\d+$/.test(textoBusqueda)) {
        nuevosFiltros.folio = textoBusqueda;
      } else {
        nuevosFiltros.razonSocial = textoBusqueda;
      }
    }

    // Aplicar filtro por serie (Tipo)
    if (this.serieSeleccionada) {
      nuevosFiltros.serieDocumento = this.serieSeleccionada;
    }

    // Aplicar filtro por fechas
    if (this.fechaInicio) {
      nuevosFiltros.fechaInicio = this.fechaInicio;
    }

    if (this.fechaFin) {
      nuevosFiltros.fechaFin = this.fechaFin;
    }

    // Actualizar filtros del servicio
    this.filtros = nuevosFiltros;

    // Reiniciar a página 1 y cargar datos
    this.currentPage.set(1);
    this.cargarCotizaciones();
  }

  limpiarFiltros(): void {
    console.log('Limpiando filtros...');

    // Limpiar variables del template
    this.textoBusqueda = '';
    this.estadoSeleccionado = '';
    this.serieSeleccionada = '';
    // Establecer fechas por defecto (último mes)
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);

    this.fechaInicio = fechaInicio.toISOString().split('T')[0];
    this.fechaFin = fechaFin.toISOString().split('T')[0];

    // Limpiar filtros temporales
    this.filtrosTemporales.set({
      texto: '',
      estado: '',
      serie: '',
      fechaInicio: '',
      fechaFin: '',
    });

    this.serieSeleccionada = '';

    // Limpiar filtros del servicio
    this.filtros = {
      page: 1,
      pageSize: this.pageSize(),
      incluirMovimientos: false,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
    };

    // Aplicar limpieza
    this.currentPage.set(1);
    this.cargarCotizaciones();
  }

  get hayFiltrosActivos(): boolean {
    const temporales = this.filtrosTemporales();
    const fechaInicioDefault = this.getFechaInicioDefault();
    const fechaFinDefault = this.getFechaFinDefault();

    return !!(
      temporales.texto ||
      temporales.estado !== '' ||
      temporales.serie !== '' ||
      (temporales.fechaInicio &&
        temporales.fechaInicio !== fechaInicioDefault) ||
      (temporales.fechaFin && temporales.fechaFin !== fechaFinDefault)
    );
  }

  private getFechaInicioDefault(): string {
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);
    return fechaInicio.toISOString().split('T')[0];
  }

  private getFechaFinDefault(): string {
    return new Date().toISOString().split('T')[0];
  }

  get resumenFiltros(): string {
    const filtros = [];
    const temporales = this.filtrosTemporales();
    const fechaInicioDefault = this.getFechaInicioDefault();
    const fechaFinDefault = this.getFechaFinDefault();

    if (temporales.texto) {
      filtros.push(`Búsqueda: "${temporales.texto}"`);
    }

    if (temporales.estado !== null) {
      const estadoLabel = this.opcionesEstados.find(
        (e) => e.value === temporales.estado,
      )?.label;
      filtros.push(`Estado: ${estadoLabel}`);
    }

    if (temporales.serie !== '') {
      const tipoLabel = this.tipoSeleccionado.find(
        (t) => t.value === temporales.serie,
      )?.label;
      filtros.push(`Tipo: ${tipoLabel}`);
    }

    if (
      temporales.fechaInicio !== fechaInicioDefault ||
      temporales.fechaFin !== fechaFinDefault
    ) {
      filtros.push(
        `Fechas: ${temporales.fechaInicio} - ${temporales.fechaFin}`,
      );
    }

    return filtros.join(' • ');
  }

  // ==================== MODAL OPERATIONS ====================

  abrirModalCrear(): void {
    this.router.navigate(['crear'], { relativeTo: this.route });
  }

  verDetalle(cotizacion: CotizacionLegacyResponse): void {
    this.idDocumentoSeleccionado.set(cotizacion.idDocumento);
    this.showDetailModal.set(true);
  }

  cerrarModalDetalle(): void {
    this.showDetailModal.set(false);
    this.idDocumentoSeleccionado.set(0);
  }

  editarCotizacion(idDocumento: number): void {
    this.router.navigate(['editar', idDocumento], { relativeTo: this.route });
  }

  // ==================== LÓGICA DE GENERACIÓN DE PDF ====================

  /**
   * Obtiene los datos completos de una cotización para generar PDF
   */
  private async obtenerDatosParaPDF(idDocumento: number): Promise<{
    cotizacion: CotizacionLegacyResponse | null;
    cliente: any;
    unitMap: Map<number, string>;
  }> {
    // Obtener cotización por ID (asumiendo que tienes un método para obtener por ID)
    const cotizacion = await firstValueFrom(
      this.cotizacionService.obtenerPorId(idDocumento),
    );

    if (!cotizacion.success || !cotizacion.data) {
      throw new Error('No se pudo obtener la cotización');
    }

    const data = cotizacion.data;

    // Obtener cliente
    const clienteResponse = await firstValueFrom(
      this.clienteService.obtenerPorId(data.idCliente ?? 0, true),
    );

    // Calcular teléfono del cliente
    let telefonoCalculado: string | undefined = 'Sin teléfono';
    if (clienteResponse) {
      if (clienteResponse.telefono) {
        telefonoCalculado = clienteResponse.telefono;
      } else if (clienteResponse.ubicacionDetalle?.telefono1) {
        telefonoCalculado = clienteResponse.ubicacionDetalle?.telefono1;
      } else if (clienteResponse.ubicacionDetalle?.telefono2) {
        telefonoCalculado = clienteResponse.ubicacionDetalle?.telefono2;
      } else if (clienteResponse.ubicacionDetalle?.telefonoCompleto) {
        telefonoCalculado = clienteResponse.ubicacionDetalle?.telefonoCompleto;
      }
    }

    // Obtener unidades de medida
    const movimientos = data?.movimientos || [];
    const uniqueUnitIds = [
      ...new Set(
        movimientos.map((m: any) => m.idUnidad).filter((id: number) => id > 0),
      ),
    ];
    const unitMap = new Map<number, string>();

    await Promise.all(
      uniqueUnitIds.map(async (id: number) => {
        try {
          const resp = await firstValueFrom(
            this.unidadMedidaService.obtenerPorId(id),
          );
          if (resp.success && resp.data) {
            unitMap.set(id, resp.data.abreviatura);
          }
        } catch (e) {
          console.error(`Error obteniendo unidad ${id}`, e);
        }
      }),
    );

    return {
      cotizacion: data,
      cliente: {
        ...clienteResponse,
        telefonoCalculado,
      },
      unitMap,
    };
  }

  /**
   * Construye el objeto de datos para el PDF
   */
  private construirDatosPDF(
    data: CotizacionLegacyResponse,
    cliente: any,
    unitMap: Map<number, string>,
  ): CotizacionPDF {
    const totalDescuentosDoc =
      (data?.descuentoDoc1 ?? 0) +
      (data?.descuentoDoc2 ?? 0) +
      (data?.descuentoDoc3 ?? 0);

    return {
      serie: `${data?.serieDocumento ?? 'CA'}`,
      folio: `${data?.folio ?? 0}`,
      fecha: this.formatDate(data?.fecha),
      fechaVencimiento: data?.fechaVencimiento
        ? this.formatDate(data?.fechaVencimiento)
        : 'N/A',

      empresa: {
        nombre: 'CABS COMPUTACION DGO SA DE CV',
        rfc: 'CCD123456XYZ',
        direccion: 'Calle Beatriz Prado #123',
        colonia: 'Benjamín Méndez',
        cpCiudadEstado: '34020, Victoria de Durango, Durango',
        telefono: '6188111371',
      },

      cliente: {
        nombre: data?.razonSocial || 'Público en General',
        rfc: cliente?.rfc || '',
        direccion: `${cliente?.ubicacionDetalle?.calle ?? ''} ${
          cliente?.ubicacionDetalle?.numeroExterior ?? ''
        }`.trim(),
        colonia: cliente?.ubicacionDetalle?.colonia || '',
        cp: cliente?.ubicacionDetalle?.codigoPostal || '',
        ciudad: `${
          cliente?.ubicacionDetalle?.ciudad ||
          cliente?.ubicacionDetalle?.municipio ||
          ''
        }`,
        telefono: cliente?.telefonoCalculado || '',
      },

      productos: (data?.movimientos || []).map((mov: any) => ({
        cantidad: mov.unidadesCapturadas ?? 0,
        unidad: unitMap.get(mov.idUnidad) || 'PZA',
        descripcion: mov.nombreProducto ?? 'Producto sin nombre',
        precioUnitario: mov.precioCapturado ?? 0,
        porcDescuento: mov.porcentajeDescuento ?? 0,
        importeDescuento: mov.descuentoLinea ?? 0,
        importe: mov.neto ?? 0,
        observaciones: mov.observaciones ?? '',
        importeIVA: mov.impuesto1 ?? 0,
        total: mov.total ?? 0,
      })),

      totales: {
        subtotal: data?.subtotal ?? 0,
        descuento: totalDescuentosDoc,
        iva: data?.iva ?? 0,
        total: data?.total ?? 0,
        totalLetra: '',
      },

      observaciones: data?.observaciones ?? '',
    };
  }

  /**
   * Descarga PDF con IVA
   */
  async descargarConIVA(idDocumento: number) {
    this.menuAbiertoId.set(null);
    this.generandoPdf.set(true);

    try {
      const { cotizacion, cliente, unitMap } =
        await this.obtenerDatosParaPDF(idDocumento);

      if (!cotizacion) {
        throw new Error('No se pudo obtener la cotización');
      }

      const datosParaPdf = this.construirDatosPDF(cotizacion, cliente, unitMap);

      await this.exportService.generarPdfCotizacion(datosParaPdf);

      this.mostrarNotificacionExito('PDF generado correctamente');
      console.log('PDF con IVA generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF con IVA:', error);
      this.mostrarNotificacionError('Error al generar el PDF');
    } finally {
      this.generandoPdf.set(false);
    }
  }

  /**
   * Descarga PDF sin IVA
   */
  async descargarSinIVA(idDocumento: number) {
    this.menuAbiertoId.set(null);
    this.generandoPdf.set(true);

    try {
      const { cotizacion, cliente, unitMap } =
        await this.obtenerDatosParaPDF(idDocumento);

      if (!cotizacion) {
        throw new Error('No se pudo obtener la cotización');
      }

      const datosParaPdf = this.construirDatosPDF(cotizacion, cliente, unitMap);

      await this.exportService.generarPdfSinIVACotizacion(datosParaPdf);

      this.mostrarNotificacionExito('PDF generado correctamente');
      console.log('PDF sin IVA generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF sin IVA:', error);
      this.mostrarNotificacionError('Error al generar el PDF');
    } finally {
      this.generandoPdf.set(false);
    }
  }

  /**
   * Descarga PDF sin IVA
   */
  async descargarOrdenCompra(idDocumento: number) {
    this.menuAbiertoId.set(null);
    this.generandoPdf.set(true);

    try {
      const { cotizacion, cliente, unitMap } =
        await this.obtenerDatosParaPDF(idDocumento);

      if (!cotizacion) {
        throw new Error('No se pudo obtener la cotización');
      }

      const datosParaPdf = this.construirDatosPDF(cotizacion, cliente, unitMap);

      await this.exportService.generarPdfOrdenCompra(datosParaPdf);

      this.mostrarNotificacionExito('PDF generado correctamente');
      console.log('PDF de Orden Compra generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF :', error);
      this.mostrarNotificacionError('Error al generar el PDF');
    } finally {
      this.generandoPdf.set(false);
    }
  }

  // ==================== MANEJADORES DE EVENTOS DEL HIJO ====================

  /**
   * Maneja la cancelación exitosa desde el modal hijo
   */
  onCancelacionCompletada(): void {
    console.log('Cancelación completada - recargando datos');
    this.cargarCotizaciones();
    this.cargarResumen();
    this.cerrarModalDetalle();
    this.mostrarNotificacionExito(
      'La cotización ha sido cancelada exitosamente',
    );
  }

  /**
   * Maneja la eliminación exitosa desde el modal hijo
   */
  onEliminacionCompletada(idDocumento: number): void {
    console.log('Eliminación completada - recargando datos', idDocumento);
    this.cargarCotizaciones();
    this.cargarResumen();
    this.cerrarModalDetalle();
    this.mostrarNotificacionExito(
      'La cotización ha sido eliminada exitosamente',
    );
  }

  /**
   * Maneja la creación exitosa (cuando vuelvas de la página de crear)
   */
  onCreacionCompletada(): void {
    console.log('Creación completada - recargando datos');
    this.cargarCotizaciones();
    this.cargarResumen();
    this.mostrarNotificacionExito('Cotización creada exitosamente');
  }

  /**
   * Maneja la edición exitosa (cuando vuelvas de la página de editar)
   */
  onEdicionCompletada(): void {
    console.log('Edición completada - recargando datos');
    this.cargarCotizaciones();
    this.cargarResumen();
    this.mostrarNotificacionExito('Cotización actualizada exitosamente');
  }

  /**
   * Maneja la solicitud de cancelación desde el hijo
   */
  onSolicitudCancelacion(idDocumento: number): void {
    console.log('Solicitud de cancelación recibida:', idDocumento);
  }

  /**
   * Maneja la solicitud de eliminación desde el hijo
   */
  onSolicitudEliminacion(idDocumento: number): void {
    console.log('Solicitud de eliminación recibida:', idDocumento);
  }

  // ==================== MÉTODOS PARA CANCELACIÓN ====================

  solicitarCancelacion(idDocumento: number): void {
    this.idDocumentoParaAccion.set(idDocumento);
    this.mostrarAlertaCancelacion.set(true);
  }

  onMotivoChange(motivo: string): void {
    this.motivoCancelacion.set(motivo);
    this.errorMotivo.set('');
  }

  validarMotivo(): boolean {
    const motivo = this.motivoCancelacion().trim();

    if (!motivo) {
      this.errorMotivo.set('El motivo de cancelación es obligatorio');
      return false;
    }

    if (motivo.length < 5) {
      this.errorMotivo.set('El motivo debe tener al menos 5 caracteres');
      return false;
    }

    return true;
  }

  confirmarCancelacion(): void {
    if (!this.validarMotivo()) {
      return;
    }

    this.loadingCancelacion.set(true);
    const motivo = this.motivoCancelacion().trim();
    const idDocumento = this.idDocumentoParaAccion();

    this.cotizacionService
      .cancelar({
        idDocumento,
        motivo,
      })
      .subscribe({
        next: (response: any) => {
          this.loadingCancelacion.set(false);

          if (response.success) {
            this.cerrarAlertas();
            this.cargarCotizaciones();
            this.cargarResumen();

            if (this.showDetailModal()) {
              this.cerrarModalDetalle();
            }

            this.mostrarNotificacionExito(
              'La cotización ha sido cancelada exitosamente',
            );
          } else {
            this.errorMotivo.set(
              response.message || 'Error al cancelar la cotización',
            );
            this.mostrarNotificacionError(
              response.message || 'Error al cancelar la cotización',
            );
          }
        },
        error: (err) => {
          this.loadingCancelacion.set(false);
          const mensajeError =
            err.error?.message ||
            err.message ||
            'No se pudo cancelar la cotización';
          this.errorMotivo.set(mensajeError);
          this.mostrarNotificacionError(mensajeError);
        },
      });
  }

  // ==================== MÉTODOS PARA ELIMINACIÓN ====================

  solicitarEliminacion(idDocumento: number): void {
    this.idDocumentoParaAccion.set(idDocumento);

    // Verificar si la cotización está cancelada
    const cotizacion = this.cotizaciones().find(
      (c) => c.idDocumento === idDocumento,
    );

    if (cotizacion?.estado !== 'Cancelada') {
      this.mostrarNotificacionAdvertencia(
        'Solo se pueden eliminar cotizaciones que estén en estado Cancelado',
        'No se puede eliminar',
      );
      return;
    }

    // Mostrar confirmación con SweetAlert2 (o podrías usar tu propio diálogo)
    if (
      confirm(
        '¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer.',
      )
    ) {
      this.confirmarEliminacion(idDocumento);
    }
  }

  confirmarEliminacion(idDocumento: number): void {
    this.loadingEliminacion.set(true);

    this.cotizacionService.eliminar(idDocumento).subscribe({
      next: (response: any) => {
        this.loadingEliminacion.set(false);

        if (response.success) {
          this.cargarCotizaciones();
          this.cargarResumen();

          if (this.showDetailModal()) {
            this.cerrarModalDetalle();
          }

          this.mostrarNotificacionExito(
            'La cotización ha sido eliminada exitosamente',
          );
        } else {
          this.mostrarNotificacionError(
            response.message || 'Error al eliminar la cotización',
          );
        }
      },
      error: (err) => {
        this.loadingEliminacion.set(false);
        const mensajeError =
          err.error?.message ||
          err.message ||
          'No se pudo eliminar la cotización';
        this.mostrarNotificacionError(mensajeError);
      },
    });
  }

  cerrarAlertas(): void {
    this.mostrarAlertaCancelacion.set(false);
    this.mostrarAlertaEliminacion.set(false);
    this.menuAbiertoId.set(null);
    this.motivoCancelacion.set('');
    this.errorMotivo.set('');
    this.idDocumentoParaAccion.set(0);
  }

  // ==================== MENÚ Y PAGINACIÓN ====================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.menuAbiertoId() !== null) {
      const target = event.target as HTMLElement;
      const isMenuButton = target.closest('button[title="Descargar"]');

      if (!isMenuButton) {
        this.menuAbiertoId.set(null);
      }
    }
  }

  toggleMenu(idDocumento: number, event: Event) {
    event.stopPropagation();
    this.menuAbiertoId.set(
      this.menuAbiertoId() === idDocumento ? null : idDocumento,
    );
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.cargarCotizaciones();
  }

  cambiarPaginaAnterior(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.cargarCotizaciones();
    }
  }

  cambiarPaginaSiguiente(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.cargarCotizaciones();
    }
  }

  cambiarTamanoPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(1);
    this.cargarCotizaciones();
  }

  // ==================== UTILIDADES ====================

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Activa':
        return 'status active';
      case 'Cancelada':
        return 'status cancelled';
      default:
        return 'status pending';
    }
  }

  getEstadoText(estado: string): string {
    switch (estado) {
      case 'Activa':
        return 'Activo';
      case 'Cancelada':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date
      .toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      .replace('.', '');
  }

  getFolioCompleto(cotizacion: CotizacionLegacyResponse): string {
    return `${cotizacion.serieDocumento || ''}${cotizacion.folio}`;
  }
}
