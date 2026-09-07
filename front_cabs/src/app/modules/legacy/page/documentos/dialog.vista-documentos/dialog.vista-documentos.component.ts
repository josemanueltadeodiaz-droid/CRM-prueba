// =====================================================================================
// DIALOG VISTA DOCUMENTOS - Panel Lateral de Detalles - VERSIÓN CORREGIDA
// =====================================================================================
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CotizacionLegacyService } from '../../../../../core/services/cotizacion-legacy.service';
import {
  CotizacionLegacyResponse,
  CotizacionPDF,
} from '../../../../../core/models/cotizacion-legacy.interface';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { ClienteLegacyResponse } from '../../../../../core/models/cliente-legacy.interface';
import { UnidadLegacyService } from '../../../../../core/services/unidad-legacy.service';
import { ExportService } from '../../../../../core/services/export.service';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UitipografiaComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiDividerComponent } from '../../../../../shared/atoms/linea/linea.component';
import { UiAvatarComponent } from '../../../../../shared/atoms/avatar/avatar.component';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';
import { ModalEnivarCotizacion } from '../../../../../shared/templates/modales/cotizaciones/enviar-cotizacon/modal-enivar-cotizacion.component';
import { UiDialogAlertComponent } from '../../../../../shared/organisms/dialogAlert/dialogAlert.component';

import { ModalEnviarPruebas, ModalEnviarCotizacionDataPrueba } from '../../../../../shared/templates/modales/prueba/modal-enivar-cotizacion.component';

type TipoAlerta = 'eliminar' | 'advertencia' | 'aprovado';

@Component({
  selector: 'app-dialog-vista-documentos',
  standalone: true,
  imports: [
    CommonModule,
    UiHeaderModal,
    UitipografiaComponent,
    UiAvatarComponent,
    UiIconComponent,
    UiBotonComponent,
    MatDialogModule,
    UiDialogAlertComponent,
    ModalEnviarPruebas
  ],
  templateUrl: './dialog.vista-documentos.component.html',
})

export class DialogVistaDocumentosComponent implements OnInit {
  @Input() idDocumento!: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() solicitudCancelacion = new EventEmitter<number>();
  @Output() solicitudEliminacion = new EventEmitter<number>();
  @Output() cancelacionCompletada = new EventEmitter<void>();

  // Signals principales
  mostrarModalEnivarPrueba =signal<boolean>(false);
  visible = signal<boolean>(false);
  cotizacion = signal<CotizacionLegacyResponse | null>(null);
  error = signal<string | null>(null);
  cliente = signal<ClienteLegacyResponse | null>(null);

  // Signals para PDF y email
  generandoPdf = signal<boolean>(false);
  enviandoEmail = signal<boolean>(false);

  // Signals para menús
  menuAbierto = signal<boolean>(false);


  // Signals para los estados 
  mostrarEsqueleto = signal<boolean>(false);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  sinDatos = signal<boolean>(false); 
  


  // Signals para alertas
  mostrarAlertaCancelacion = signal<boolean>(false);
  mostrarAlertaEliminacion = signal<boolean>(false);
  motivoCancelacion = signal<string>('');
  loadingCancelacion = signal<boolean>(false);
  loadingEliminacion = signal<boolean>(false);
  tipoAlerta = signal<TipoAlerta>('eliminar');
  errorMotivo = signal<string>('');

  // Variables para callbacks de alertas
  funcionCerrarAlert!: () => void;
  funcionAccionAlert!: () => void;

  // Variables para el modal de envío
  tabActivo = signal<string>('Tipo-de-envio');
  medioEnvioSeleccionado: string = '';
  tipoIVASeleccionado: string = '';
  medioEnvioPersonalizadoSeleccionado: string = '';
  tipoIVAPersonalizadoSeleccionado: string = '';

  clienteId: number | undefined;
  telefonoCliente?: string;

  constructor(
    private cotizacionService: CotizacionLegacyService,
    private clienteService: ClienteLegacyService,
    private exportService: ExportService,
    private unidadMedidaService: UnidadLegacyService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  // Método para abrir el modal
  async abrirModalEnviarPrueba(): Promise<void> {
    try {
      console.log('Abriendo modal de envío...');
      console.log('ID Documento:', this.idDocumento);
      console.log('Cotización actual:', this.cotizacion());
      
      // Obtener el ID del cliente de la cotización
      const clienteId = this.cotizacion()?.idCliente;
      
      if (!clienteId) {
        console.error('No hay ID de cliente en la cotización');
        // Si no hay cliente, al menos mostrar el modal con datos básicos
        this.dataParaModal = {
          idCotizacion: this.idDocumento,
          cliente: null,
          cotizacion: this.cotizacion()
        };
        this.mostrarModalEnivarPrueba.set(true);
        return;
      }

      console.log('Cargando datos del cliente ID:', clienteId);
      
      // Cargar datos actualizados del cliente
      const cliente = await firstValueFrom(
        this.clienteService.obtenerPorId(clienteId, true)
      );

      console.log('Cliente cargado:', cliente);

      // Actualizar dataParaModal con los datos cargados
      this.dataParaModal = {
        idCotizacion: this.idDocumento,
        cliente: cliente,
        cotizacion: this.cotizacion()
      };

      console.log('Data para modal actualizada:', this.dataParaModal);

      // Abrir el modal
      this.mostrarModalEnivarPrueba.set(true);
      
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      // En caso de error, mostrar modal con datos disponibles
      this.dataParaModal = {
        idCotizacion: this.idDocumento,
        cliente: null,
        cotizacion: this.cotizacion()
      };
      this.mostrarModalEnivarPrueba.set(true);
    }
  }

  // =======================================================================
  // MÉTODOS DE INICIALIZACIÓN
  // =======================================================================
  ngOnInit(): void {
    setTimeout(() => this.visible.set(true), 50);
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    // Estado inicial de carga
    this.mostrarEsqueleto.set(true);
    this.monstrarDatos.set(false);
    this.errorDeConexion.set(false);
    this.error.set(null);

    this.cotizacionService.obtenerPorId(this.idDocumento).subscribe({
      next: async (response) => {
        try {
          if (response.success && response.data) {
            this.cotizacion.set(response.data);
            
            // Precargar datos del cliente para el modal
            if (response.data.idCliente) {
              try {
                console.log('Precargando datos del cliente:', response.data.idCliente);
                const cliente = await firstValueFrom(
                  this.clienteService.obtenerPorId(response.data.idCliente, true)
                );
                
                this.cliente.set(cliente);
                
                // Actualizar dataParaModal con los datos precargados
                this.dataParaModal = {
                  idCotizacion: this.idDocumento,
                  cliente: cliente,
                  cotizacion: response.data
                };
                
                console.log('Data para modal precargada:', this.dataParaModal);
                
              } catch (error) {
                console.error('Error precargando datos del cliente:', error);
                // Decidir si quieres mostrar datos aunque falle el cliente
                this.error.set('Error al cargar datos del cliente');
                // Opcional: podrías continuar sin datos del cliente
              }
            }
            
            // Mostrar datos solo si todo está OK
            this.monstrarDatos.set(true);
            this.mostrarEsqueleto.set(false);
            
          } else {
            this.error.set('No se pudo cargar la cotización');
            // No mostrar datos si la respuesta no es exitosa
            this.monstrarDatos.set(false);
          }
          
        } finally {
          // Ocultar esqueleto siempre al finalizar
          this.mostrarEsqueleto.set(false);
        }
      },
      error: (err) => {
        this.error.set(err.mensaje || 'Error al cargar los detalles');
        this.monstrarDatos.set(false);
        this.errorDeConexion.set(true); // Sugiero cambiar esto a true
      },
    });
  }


  // En DialogVistaDocumentosComponent, agrega este método:
  handleEnviado(exitoso: boolean): void {
    if (exitoso) {
      console.log('✅ Cotización enviada exitosamente');
      // Opcional: Mostrar alguna notificación o actualizar datos
      // this.mostrarNotificacion('Cotización enviada correctamente');
      
      // Opcional: Recargar los detalles si es necesario
      // this.cargarDetalle();
    } else {
      console.log('❌ Error al enviar cotización');
    }
  }
  // =======================================================================
  // MÉTODOS PARA ALERTAS
  // =======================================================================

  /**
   * Abre la alerta de cancelación
   */
  solicitarCancelacion() {
    // Configurar callbacks para la alerta de cancelación
    this.funcionCerrarAlert = () => {
      console.log('Cerrando alerta de cancelación');
      this.cerrarSoloAlertas();
    };

    this.funcionAccionAlert = () => {
      console.log('Ejecutando confirmarCancelacion');
      this.confirmarCancelacion();
    };

    // Mostrar la alerta de cancelación
    this.tipoAlerta.set('advertencia');
    this.mostrarAlertaCancelacion.set(true);
  }

  /**
   * Abre la alerta de eliminación o advertencia según el estado
   */
  solicitarEliminacion() {
    if (this.cotizacion()?.estado !== 'Cancelada') {
      // Mostrar advertencia de que no se puede eliminar
      this.tipoAlerta.set('advertencia');

      this.funcionCerrarAlert = () => {
        console.log('Cerrando alerta de advertencia');
        this.cerrarSoloAlertas();
      };

      this.funcionAccionAlert = () => {
        console.log('Acción de advertencia - solo cerrar');
        this.cerrarSoloAlertas();
      };

      this.mostrarAlertaEliminacion.set(true);
      console.log(
        'Mostrando alerta de advertencia - estado:',
        this.cotizacion()?.estado,
      );
      return;
    }

    // Configurar alerta de eliminación (cuando SÍ está cancelada)
    console.log('Configurando alerta de eliminación - cotización cancelada');
    this.tipoAlerta.set('eliminar');

    this.funcionCerrarAlert = () => {
      console.log('Cerrando alerta de eliminación');
      this.cerrarSoloAlertas();
    };

    this.funcionAccionAlert = () => {
      console.log('Ejecutando confirmarEliminacion');
      this.confirmarEliminacion();
    };

    this.mostrarAlertaEliminacion.set(true);
  }

  /**
   * Cierra SOLO las alertas, sin cerrar el panel principal
   */
  cerrarSoloAlertas(): void {
    console.log('Cerrando solo alertas');
    this.mostrarAlertaCancelacion.set(false);
    this.mostrarAlertaEliminacion.set(false);
    this.menuAbierto.set(false);
    this.motivoCancelacion.set('');
    this.errorMotivo.set('');
    this.loadingCancelacion.set(false);
    this.loadingEliminacion.set(false);
  }

  /**
   * Cierra todo: alertas y el panel principal
   */
  cerrarTodo(): void {
    console.log('Cerrando todo (alertas y panel)');
    this.cerrarSoloAlertas();
    this.cerrarPanel();
  }

  /**
   * Método para manejar el cambio en el input de motivo
   */
  onMotivoChange(motivo: string): void {
    this.motivoCancelacion.set(motivo);
    this.errorMotivo.set('');
  }

  /**
   * Validar el motivo antes de enviar
   */
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

    if (motivo.length > 200) {
      this.errorMotivo.set('El motivo no puede exceder los 200 caracteres');
      return false;
    }

    return true;
  }

  // =======================================================================
  // MÉTODOS DE ACCIÓN - CORREGIDOS (SIN SWAL)
  // =======================================================================

  /**
   * Confirmar cancelación de cotización
   */
  confirmarCancelacion() {
    if (!this.validarMotivo()) {
      return;
    }

    this.loadingCancelacion.set(true);
    const motivo = this.motivoCancelacion().trim();

    this.cotizacionService
      .cancelar({
        idDocumento: this.idDocumento,
        motivo: motivo,
      })
      .subscribe({
        next: (response: any) => {
          this.loadingCancelacion.set(false);

          if (response.success) {
            console.log('✅ Cancelación exitosa');

            // Emitir eventos
            this.solicitudCancelacion.emit(this.idDocumento);
            this.cancelacionCompletada.emit();

            // CERRAR TODO: alertas y panel principal
            this.cerrarTodo();
          } else {
            this.errorMotivo.set(
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
          console.error('❌ Error en cancelación:', mensajeError);
        },
      });
  }

  /**
   * Confirmar eliminación de cotización
   */
  confirmarEliminacion() {
    this.loadingEliminacion.set(true);

    this.cotizacionService.eliminar(this.idDocumento).subscribe({
      next: (response: any) => {
        this.loadingEliminacion.set(false);

        if (response.success) {
          console.log('✅ Eliminación exitosa');

          // Emitir eventos
          this.solicitudEliminacion.emit(this.idDocumento);

          // CERRAR TODO: alertas y panel principal
          this.cerrarTodo();
        } else {
          console.error('❌ Error en eliminación:', response.message);
          this.errorMotivo.set(
            response.message || 'Error al eliminar la cotización',
          );
        }
      },
      error: (err) => {
        this.loadingEliminacion.set(false);
        console.error('❌ Error al eliminar:', err);
        const mensajeError =
          err.error?.message ||
          err.message ||
          'No se pudo eliminar la cotización';
        this.errorMotivo.set(mensajeError);
      },
    });
  }

  /**
   * Cerrar el panel principal
   */
  cerrarPanel(): void {
    console.log('Cerrando panel principal');
    this.visible.set(false);
    setTimeout(() => {
      this.cerrar.emit();
    }, 300);
  }

  // =======================================================================
  // MÉTODOS DE MENÚ Y NAVEGACIÓN
  // =======================================================================

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.menuAbierto.set(!this.menuAbierto());
  }

  @HostListener('document:click', ['$event'])
  clickOut(event: MouseEvent) {
    this.menuAbierto.set(false);
  }

  ejecutarAccion(tipo: string) {
    this.menuAbierto.set(false);

    switch (tipo) {
      case 'SinIva':
        this.imprimirDocumentoSinIVA();
        break;
      case 'editar':
        this.cerrarPanel();
        this.router.navigate([
          '/legacy/operaciones/documentos/editar',
          this.idDocumento,
        ]);
        break;
      case 'ConIva':
        this.imprimirDocumento();
        break;
      case 'OC':
        this.imprimirDocumentoOC();
        break;
    }
  }

  // =======================================================================
  // LÓGICA DE GENERACIÓN DE PDF (sin cambios)
  // =======================================================================
  async imprimirDocumento() {
    const data = this.cotizacion();
    this.clienteId = this.cotizacion()?.idCliente;
    console.log('ID Cliente: ', this.clienteId);
    const cliente = await firstValueFrom(
      this.clienteService.obtenerPorId(this.clienteId ?? 0, true),
    );

    console.log(data);
    this.cliente.set(cliente);

    let telefonoCalculado: string | undefined = 'Sin teléfono';

    if (this.cliente()) {
      if (this.cliente()?.telefono) {
        telefonoCalculado = this.cliente()?.telefono;
      } else if (this.cliente()?.ubicacionDetalle?.telefono1) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono1;
      } else if (this.cliente()?.ubicacionDetalle?.telefono2) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono2;
      } else if (this.cliente()?.ubicacionDetalle?.telefonoCompleto) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefonoCompleto;
      }
    }

    this.generandoPdf.set(true);

    try {
      const movimientos = data?.movimientos || [];
      const uniqueUnitIds = [
        ...new Set(movimientos.map((m) => m.idUnidad).filter((id) => id > 0)),
      ];
      const unitMap = new Map<number, string>();

      await Promise.all(
        uniqueUnitIds.map(async (id) => {
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

      const totalDescuentosDoc =
        (data?.descuentoDoc1 ?? 0) +
        (data?.descuentoDoc2 ?? 0) +
        (data?.descuentoDoc3 ?? 0);

      const datosParaPdf: CotizacionPDF = {
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
          rfc: this.cliente()?.rfc || '',
          direccion: `${this.cliente()?.ubicacionDetalle?.calle ?? ''} ${
            this.cliente()?.ubicacionDetalle?.numeroExterior ?? ''
          }`.trim(),
          colonia: this.cliente()?.ubicacionDetalle?.colonia || '',
          cp: this.cliente()?.ubicacionDetalle?.codigoPostal || '',
          ciudad: `${
            this.cliente()?.ubicacionDetalle?.ciudad ||
            this.cliente()?.ubicacionDetalle?.municipio ||
            ''
          }`,
          telefono: `${telefonoCalculado}` || '',
        },

        productos: (data?.movimientos || []).map((mov) => ({
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

      await this.exportService.generarPdfCotizacion(datosParaPdf);
      console.log('PDF generado exitosamente datos: ', datosParaPdf);
    } catch (error) {
      console.error('Error generando PDF', error);
    } finally {
      this.generandoPdf.set(false);
    }
  }

  async imprimirDocumentoSinIVA() {
    const data = this.cotizacion();
    this.clienteId = this.cotizacion()?.idCliente;
    console.log('ID Cliente: ', this.clienteId);
    const cliente = await firstValueFrom(
      this.clienteService.obtenerPorId(this.clienteId ?? 0, true),
    );

    this.cliente.set(cliente);

    let telefonoCalculado: string | undefined = 'Sin teléfono';

    if (this.cliente()) {
      if (this.cliente()?.telefono) {
        telefonoCalculado = this.cliente()?.telefono;
      } else if (this.cliente()?.ubicacionDetalle?.telefono1) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono1;
      } else if (this.cliente()?.ubicacionDetalle?.telefono2) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono2;
      } else if (this.cliente()?.ubicacionDetalle?.telefonoCompleto) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefonoCompleto;
      }
    }

    this.generandoPdf.set(true);

    try {
      const movimientos = data?.movimientos || [];
      const uniqueUnitIds = [
        ...new Set(movimientos.map((m) => m.idUnidad).filter((id) => id > 0)),
      ];
      const unitMap = new Map<number, string>();

      await Promise.all(
        uniqueUnitIds.map(async (id) => {
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

      const totalDescuentosDoc =
        (data?.descuentoDoc1 ?? 0) +
        (data?.descuentoDoc2 ?? 0) +
        (data?.descuentoDoc3 ?? 0);

      const datosParaPdf: CotizacionPDF = {
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
          rfc: this.cliente()?.rfc || '',
          direccion: `${this.cliente()?.ubicacionDetalle?.calle ?? ''} ${
            this.cliente()?.ubicacionDetalle?.numeroExterior ?? ''
          }`.trim(),
          colonia: this.cliente()?.ubicacionDetalle?.colonia || '',
          cp: this.cliente()?.ubicacionDetalle?.codigoPostal || '',
          ciudad:
            this.cliente()?.ubicacionDetalle?.ciudad ||
            this.cliente()?.ubicacionDetalle?.municipio ||
            '',
          telefono: telefonoCalculado || '',
        },

        productos: (data?.movimientos || []).map((mov) => ({
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

      await this.exportService.generarPdfSinIVACotizacion(datosParaPdf);
      console.log('PDF generado exitosamente datos: ', datosParaPdf);
    } catch (error) {
      console.error('Error generando PDF', error);
    } finally {
      this.generandoPdf.set(false);
    }
  }

  async imprimirDocumentoOC() {
    const data = this.cotizacion();
    this.clienteId = this.cotizacion()?.idCliente;
    console.log('ID Cliente: ', this.clienteId);
    const cliente = await firstValueFrom(
      this.clienteService.obtenerPorId(this.clienteId ?? 0, true),
    );

    this.cliente.set(cliente);

    let telefonoCalculado: string | undefined = 'Sin teléfono';

    if (this.cliente()) {
      if (this.cliente()?.telefono) {
        telefonoCalculado = this.cliente()?.telefono;
      } else if (this.cliente()?.ubicacionDetalle?.telefono1) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono1;
      } else if (this.cliente()?.ubicacionDetalle?.telefono2) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefono2;
      } else if (this.cliente()?.ubicacionDetalle?.telefonoCompleto) {
        telefonoCalculado = this.cliente()?.ubicacionDetalle?.telefonoCompleto;
      }
    }

    this.generandoPdf.set(true);

    try {
      const movimientos = data?.movimientos || [];
      const uniqueUnitIds = [
        ...new Set(movimientos.map((m) => m.idUnidad).filter((id) => id > 0)),
      ];
      const unitMap = new Map<number, string>();

      await Promise.all(
        uniqueUnitIds.map(async (id) => {
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

      const totalDescuentosDoc =
        (data?.descuentoDoc1 ?? 0) +
        (data?.descuentoDoc2 ?? 0) +
        (data?.descuentoDoc3 ?? 0);

      const datosParaPdf: CotizacionPDF = {
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
          rfc: this.cliente()?.rfc || '',
          direccion: `${this.cliente()?.ubicacionDetalle?.calle ?? ''} ${
            this.cliente()?.ubicacionDetalle?.numeroExterior ?? ''
          }`.trim(),
          colonia: this.cliente()?.ubicacionDetalle?.colonia || '',
          cp: this.cliente()?.ubicacionDetalle?.codigoPostal || '',
          ciudad:
            this.cliente()?.ubicacionDetalle?.ciudad ||
            this.cliente()?.ubicacionDetalle?.municipio ||
            '',
          telefono: telefonoCalculado || '',
        },

        productos: (data?.movimientos || []).map((mov) => ({
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

      await this.exportService.generarPdfOrdenCompra(datosParaPdf);
      console.log('PDF generado exitosamente datos: ', datosParaPdf);
    } catch (error) {
      console.error('Error generando PDF', error);
    } finally {
      this.generandoPdf.set(false);
    }
  }
  // =======================================================================
  // HELPERS
  // =======================================================================

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getEstadoBadge(cotizacion: CotizacionLegacyResponse): {
    text: string;
    class: string;
  } {
    if (cotizacion.estado === 'Cancelada') {
      return {
        text: 'CANCELADO',
        class: 'bg-red-100 text-red-800 border-red-200',
      };
    }
    if (cotizacion.estado === 'Activa') {
      return {
        text: 'ACTIVA',
        class: 'bg-green-100 text-green-800 border-green-200',
      };
    }
    return {
      text: cotizacion.estado,
      class: 'bg-gray-100 text-gray-800 border-gray-200',
    };
  }

  getDescuento1(): number {
    return this.cotizacion()?.descuentoDoc1 ?? 0;
  }
  getDescuento2(): number {
    return this.cotizacion()?.descuentoDoc2 ?? 0;
  }
  getDescuento3(): number {
    return this.cotizacion()?.descuentoDoc3 ?? 0;
  }

  getTotalDescuentos(): number {
    return this.getDescuento1() + this.getDescuento2() + this.getDescuento3();
  }

  getTotalCalculado(): number {
    const cot = this.cotizacion();
    if (!cot) return 0;
    return (cot.subtotal ?? 0) - this.getTotalDescuentos() + (cot.iva ?? 0);
  }

  // =======================================================================
  // MÉTODOS PARA EL MODAL DE ENVIAR COTIZACIÓN
  // =======================================================================

  dataPrueba: ModalEnviarCotizacionDataPrueba = {
    idCotizacion: this.idDocumento, 
    cliente: this.cliente() || { nombre: "Cliente prueba" },
    cotizacion: this.cotizacion() 
  }

// Reemplaza el método ModalEnviarCotizacion actual con esto:
async abrirModalEnviarPrueba1(): Promise<void> {
  try {
    // Obtener datos actualizados
    const ClienteID = this.cotizacion()?.idCliente;
    if (!ClienteID) {
      console.error('No hay ID de cliente');
      return;
    }
    
    const cliente = await firstValueFrom(
      this.clienteService.obtenerPorId(ClienteID, true)
    );

    // Actualizar dataParaModal
    this.dataParaModal = {
      idCotizacion: this.idDocumento,
      cliente: cliente,
      cotizacion: this.cotizacion()
    };

    // Abrir el modal
    this.mostrarModalEnivarPrueba.set(true);
    
  } catch (error) {
    console.error('Error al cargar datos del cliente:', error);
  }
}  


  dataParaModal: ModalEnviarCotizacionDataPrueba | null = null;


  async ModalEnviarCotizacion(): Promise<void> {
    let ClienteID = this.cotizacion()?.idCliente;
    var cliente = await firstValueFrom(
      this.clienteService.obtenerPorId(ClienteID!, true),
    );

    // Crear objeto con la interfaz
    const dataParaModal: ModalEnviarCotizacionDataPrueba = {
      idCotizacion: this.idDocumento,
      cliente: cliente,
      cotizacion: this.cotizacion()
    };    

    const dialogRef = this.dialog.open(ModalEnivarCotizacion, {
      width: '600px',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'adaptive-dialog',
      data: {
        idCotizacion: this.idDocumento,
        cliente: cliente,
        cotizacion: this.cotizacion(),
        modo: 'enviar',
      },
    });
  }

  cambiarTab(tabId: string) {
    this.tabActivo.set(tabId);
  }

  seleccionarMedioEnvio(valor: string) {
    this.medioEnvioSeleccionado = valor;
  }

  seleccionarTipoIVA(valor: string) {
    this.tipoIVASeleccionado = valor;
  }

  seleccionarMedioEnvioPersonalizado(valor: string) {
    this.medioEnvioPersonalizadoSeleccionado = valor;
  }

  seleccionarTipoIVAPersonalizado(valor: string) {
    this.tipoIVAPersonalizadoSeleccionado = valor;
  }

  enviarCotizacion() {
    let medioEnvio, tipoIVA;

    if (this.tabActivo() === 'Tipo-de-envio') {
      if (!this.medioEnvioSeleccionado || !this.tipoIVASeleccionado) {
        // Aquí podrías mostrar un mensaje de error en tu UI
        console.warn('Por favor, selecciona todas las opciones');
        return;
      }

      medioEnvio = this.medioEnvioSeleccionado;
      tipoIVA = this.tipoIVASeleccionado;
    } else {
      if (
        !this.medioEnvioPersonalizadoSeleccionado ||
        !this.tipoIVAPersonalizadoSeleccionado
      ) {
        console.warn('Por favor, selecciona todas las opciones personalizadas');
        return;
      }

      medioEnvio = this.medioEnvioPersonalizadoSeleccionado;
      tipoIVA = this.tipoIVAPersonalizadoSeleccionado;
    }

    if (tipoIVA === 'sinIVA') {
      this.imprimirDocumentoSinIVA();
    } else {
      this.imprimirDocumento();
    }
  }
}
