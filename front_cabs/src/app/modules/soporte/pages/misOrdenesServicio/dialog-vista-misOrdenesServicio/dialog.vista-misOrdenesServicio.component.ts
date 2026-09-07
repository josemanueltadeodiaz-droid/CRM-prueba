import {
  Component, Input, Output, EventEmitter,
  signal, computed, OnInit, OnDestroy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UiBotonComponent } from '../../../../../shared/atoms/boton/boton.component';

import { OrdenServicioPruebasService, OrdenServicioPruebaItem } from '../../../../../core/services/orden-servicio.servicePrueba';
import { AgenteLegacyService } from '../../../../../core/services/agente-legacy.service';
import { ProductoLegacyService } from '../../../../../core/services/producto-legacy.service';
import { ProductoLegacyBusqueda } from '../../../../../core/models/producto-legacy.interface';
import { NotificationService } from '../../../../../core/services/notification.service';

const WHATSAPP_NUMBER = '526181332714';

@Component({
  selector: 'app-dialog-vista-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, UiHeaderModal, UiBotonComponent],
  templateUrl: './dialog.vista-misOrdnesServicio.component.html',
})
export class DialogVistaMisOrdenesServicios implements OnInit, OnDestroy {
  @Input() orden!: OrdenServicioPruebaItem;
  @Output() cerrar           = new EventEmitter<void>();
  @Output() ordenActualizada = new EventEmitter<void>();

  private ordenesPruebaService = inject(OrdenServicioPruebasService);
  private agenteLegacyService  = inject(AgenteLegacyService);
  private productoService      = inject(ProductoLegacyService);
  private sanitizer            = inject(DomSanitizer);
  private notificationService  = inject(NotificationService);

  // ── Estado general ──────────────────────────────────────────────────────
  visible          = signal<boolean>(false);
  cargando         = signal<boolean>(false);
  monstrarDatos    = signal<boolean>(false);
  errorDeConexion  = signal<boolean>(false);
  procesandoAccion = signal<boolean>(false);

  serviciosDetalle   = signal<any[]>([]);
  entregablesDetalle = signal<any[]>([]);

  agentePrincipalNombre    = signal<string>('Sin asignar');
  agentesAuxiliaresNombres = signal<string[]>([]);
  mapaUrl = signal<SafeResourceUrl | null>(null);

  // ── Form Entregable (Producto) ──────────────────────────────────────────
  mostrarFormEntregable  = signal<boolean>(false);
  busquedaProducto       = '';
  resultadosProducto     = signal<ProductoLegacyBusqueda[]>([]);
  buscandoProducto       = signal<boolean>(false);
  productoSeleccionado   = signal<ProductoLegacyBusqueda | null>(null);

  entregableForm = {
    codigoProducto: '',
    nombreProducto: '',
    cantidad: 1,
    precioUnitario: 0,
    observaciones: ''
  };

  // ── Form Servicio ───────────────────────────────────────────────────────
  mostrarFormServicio = signal<boolean>(false);
  busquedaServicio    = '';
  resultadosServicio  = signal<ProductoLegacyBusqueda[]>([]);
  buscandoServicio    = signal<boolean>(false);
  servicioSeleccionado = signal<ProductoLegacyBusqueda | null>(null);

  servicioForm = {
    codigoProducto: '',
    nombreProducto: '',
    cantidad: 1,
    precioUnitario: 0,
    observaciones: ''
  };

  // ── Form Factura ────────────────────────────────────────────────────────
  mostrarFormFactura  = signal<boolean>(false);
  procesandoFactura   = signal<boolean>(false);
  nuevoEstadoFactura  = 'PENDIENTE';

  // ── Form Notas soporte ──────────────────────────────────────────────────
  editandoNotasSoporte  = signal<boolean>(false);
  guardandoNotasSoporte = signal<boolean>(false);
  notasSoporteEdit      = '';

  // ── Computeds ─────────────────────────────────────────────────────────────
  estadoOrdenServicio = computed(() =>
    this.toTitleCase((this.orden?.estadoOrden || '').replaceAll('_', ' ').toLowerCase() || 'pendiente')
  );

  estadoClase = computed(() => {
    const e = (this.orden?.estadoOrden || '').toUpperCase();
    const map: Record<string, string> = {
      PENDIENTE:  'bg-amber-100 text-amber-700',
      ASIGNADA:   'bg-purple-100 text-purple-700',
      EN_PROCESO: 'bg-orange-100 text-orange-700',
      EN_CURSO:   'bg-orange-100 text-orange-700',
      FINALIZADO: 'bg-green-100 text-green-700',
      CERRADA:    'bg-green-100 text-green-700',
      CANCELADA:  'bg-red-100 text-red-700',
    };
    return map[e] || 'bg-gray-100 text-gray-700';
  });

  estadoFacturaTexto = computed(() => {
    const e = (this.orden?.estadoFactura || 'PENDIENTE').toUpperCase();
    if (e === 'CONFACTURA')  return 'Con factura';
    if (e === 'SIN_FACTURA') return 'Sin factura';
    return 'Pendiente';
  });

  estadoFacturaClase = computed(() => {
    const e = (this.orden?.estadoFactura || 'PENDIENTE').toUpperCase();
    if (e === 'CONFACTURA')  return 'bg-emerald-100 text-emerald-700';
    if (e === 'SIN_FACTURA') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  });

  tipoAtencion      = computed(() => this.orden?.esVirtual ? 'Virtual' : 'Presencial');
  tipoAtencionClase = computed(() => this.orden?.esVirtual ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700');

  esOrdenFinalizada = computed(() =>
    (this.orden?.estadoOrden || '').toUpperCase() === 'FINALIZADO'
  );

  estaEnProceso = computed(() => {
    const e = (this.orden?.estadoOrden || '').toUpperCase();
    return e === 'EN_PROCESO' || e === 'EN_CURSO';
  });

  puedeEmpezar = computed(() => (this.orden?.estadoOrden || '').toUpperCase() === 'PENDIENTE');

  puedeFinalizar = computed(() => {
    const e  = (this.orden?.estadoOrden || '').toUpperCase();
    const ef = (this.orden?.estadoFactura || '').toUpperCase();
    const tieneFactura = ef === 'CONFACTURA' || ef === 'SIN_FACTURA';
    const tieneItems   = this.entregablesDetalle().length > 0 || this.serviciosDetalle().length > 0;
    return (e === 'EN_PROCESO' || e === 'EN_CURSO') && tieneFactura && tieneItems;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.visible.set(true);
    this.cargarDetalleOrden();
  }

  ngOnDestroy() { this.visible.set(false); }

  cerrarPanel(): void {
    this.visible.set(false);
    setTimeout(() => this.cerrar.emit(), 300);
  }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarDetalleOrden() {
    if (!this.orden?.documentoId) return;
    this.cargando.set(true);
    this.monstrarDatos.set(false);
    this.errorDeConexion.set(false);

    this.ordenesPruebaService.obtenerDetalle(this.orden.documentoId).subscribe({
      next: (resp: any) => {
        this.orden = { ...this.orden, ...(resp?.orden || {}) };
        this.serviciosDetalle.set(resp?.servicios || []);
        this.entregablesDetalle.set(resp?.entregables || []);
        this.construirMapa();
        this.cargarNombresAgentes();
        this.cargando.set(false);
        this.monstrarDatos.set(true);
      },
      error: (err) => {
        console.error('❌', err);
        this.cargando.set(false);
        this.errorDeConexion.set(true);
      }
    });
  }

  cargarNombresAgentes() {
    this.agenteLegacyService.getAllAgentesMap().subscribe({
      next: (map) => {
        const rawPrincipal = this.orden?.idAgentePrincipal ?? this.orden?.agentePrincipal;
        this.agentePrincipalNombre.set(this.resolverNombreAgente(rawPrincipal, map));
        this.agentesAuxiliaresNombres.set(this.resolverNombresAuxiliares(this.orden?.agenteAuxiliar, map));
      },
      error: () => {}
    });
  }

  private resolverNombreAgente(rawValue: unknown, map: Record<number, string>): string {
    const id = Number(rawValue);
    if (!isNaN(id) && id > 0) {
      return map[id] || `Agente #${id}`;
    }
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim();
    }
    return 'Sin agente asignado';
  }

  private resolverNombresAuxiliares(value: string | null | undefined, map: Record<number, string>): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .map(token => this.resolverNombreAgente(token, map));
  }

  private construirMapa(): void {
    const lat = this.orden?.latitud;
    const lng = this.orden?.longitud;
    if (lat == null || lng == null) { this.mapaUrl.set(null); return; }
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    this.mapaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  // ── Búsqueda de productos ──────────────────────────────────────────────────
  buscarProductos(): void {
    if (!this.busquedaProducto.trim()) {
      this.resultadosProducto.set([]);
      return;
    }
    this.buscandoProducto.set(true);
    this.resultadosProducto.set([]);

    this.productoService.buscarSimplificado(this.busquedaProducto).subscribe({
      next: (response) => {
        let resultados: any[] = [];
        if (Array.isArray(response)) {
          resultados = response;
        } else if (response?.data && Array.isArray(response.data)) {
          resultados = response.data;
        }
        this.resultadosProducto.set(resultados);
        this.buscandoProducto.set(false);
      },
      error: () => { this.buscandoProducto.set(false); }
    });
  }

  // ── Búsqueda de servicios ──────────────────────────────────────────────────
  buscarServicios(): void {
    if (!this.busquedaServicio.trim()) {
      this.resultadosServicio.set([]);
      return;
    }
    this.buscandoServicio.set(true);
    this.resultadosServicio.set([]);

    this.productoService.buscarSimplificado(this.busquedaServicio).subscribe({
      next: (response) => {
        let resultados: any[] = [];
        if (Array.isArray(response)) {
          resultados = response;
        } else if (response?.data && Array.isArray(response.data)) {
          resultados = response.data;
        }
        this.resultadosServicio.set(resultados);
        this.buscandoServicio.set(false);
      },
      error: () => { this.buscandoServicio.set(false); }
    });
  }

  seleccionarProducto(p: ProductoLegacyBusqueda): void {
    this.productoSeleccionado.set(p);
    this.busquedaProducto = `${p.codigoProducto} - ${p.nombreProducto}`;
    this.entregableForm.codigoProducto = p.codigoProducto;
    this.entregableForm.nombreProducto = p.nombreProducto;
    this.entregableForm.precioUnitario = p.precio || 0;
    this.resultadosProducto.set([]);
  }

  seleccionarServicio(p: ProductoLegacyBusqueda): void {
    this.servicioSeleccionado.set(p);
    this.busquedaServicio = `${p.codigoProducto} - ${p.nombreProducto}`;
    this.servicioForm.codigoProducto = p.codigoProducto;
    this.servicioForm.nombreProducto = p.nombreProducto;
    this.servicioForm.precioUnitario = p.precio || 0;
    this.resultadosServicio.set([]);
  }

  // ── Guardar entregable ────────────────────────────────────────────────────
  guardarEntregable(): void {
    if (!this.entregableForm.codigoProducto) { this.notificationService.warning('Selecciona un producto primero.'); return; }
    if (this.entregableForm.cantidad <= 0)   { this.notificationService.warning('La cantidad debe ser mayor a 0.'); return; }

    this.procesandoAccion.set(true);
    this.ordenesPruebaService.agregarEntregable(this.orden.documentoId, {
      tipo: 'PRODUCTO',
      codigoProducto: this.entregableForm.codigoProducto,
      nombreProducto: this.entregableForm.nombreProducto,
      cantidad: this.entregableForm.cantidad,
      precioUnitario: this.entregableForm.precioUnitario,
      observaciones: this.entregableForm.observaciones
    }).subscribe({
      next: () => {
        this.procesandoAccion.set(false);
        this.mostrarFormEntregable.set(false);
        this.limpiarFormEntregable();
        this.notificationService.success('Entregable agregado correctamente');
        this.cargarDetalleOrden();
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.procesandoAccion.set(false);
        this.notificationService.error(err?.error?.message || 'Error al agregar entregable.');
      }
    });
  }

  // ── Guardar servicio ──────────────────────────────────────────────────────
  guardarServicio(): void {
    if (!this.servicioForm.codigoProducto) { this.notificationService.warning('Selecciona un servicio primero.'); return; }
    if (this.servicioForm.cantidad <= 0)   { this.notificationService.warning('La cantidad debe ser mayor a 0.'); return; }

    this.procesandoAccion.set(true);
    this.ordenesPruebaService.agregarEntregable(this.orden.documentoId, {
      tipo: 'SERVICIO_ASESORIA',
      codigoProducto: this.servicioForm.codigoProducto,
      nombreProducto: this.servicioForm.nombreProducto,
      cantidad: this.servicioForm.cantidad,
      precioUnitario: this.servicioForm.precioUnitario,
      observaciones: this.servicioForm.observaciones
    }).subscribe({
      next: () => {
        this.procesandoAccion.set(false);
        this.mostrarFormServicio.set(false);
        this.limpiarFormServicio();
        this.notificationService.success('Servicio agregado correctamente');
        this.cargarDetalleOrden();
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.procesandoAccion.set(false);
        this.notificationService.error(err?.error?.message || 'Error al agregar servicio.');
      }
    });
  }

  // ── Eliminar entregable ───────────────────────────────────────────────────
  eliminarEntregable(entregableId: number): void {
    if (!confirm('¿Eliminar este entregable?')) return;
    this.ordenesPruebaService.eliminarEntregable(this.orden.documentoId, entregableId).subscribe({
      next: () => {
        this.notificationService.success('Entregable eliminado');
        this.cargarDetalleOrden();
        this.ordenActualizada.emit();
      },
      error: (err) => this.notificationService.error(err?.error?.message || 'Error al eliminar.')
    });
  }

  // ── Cambiar estado factura ────────────────────────────────────────────────
  guardarEstadoFactura(): void {
    this.procesandoFactura.set(true);
    this.ordenesPruebaService.patchEstadoFactura(this.orden.documentoId, this.nuevoEstadoFactura).subscribe({
      next: () => {
        this.orden = { ...this.orden, estadoFactura: this.nuevoEstadoFactura as any };
        this.procesandoFactura.set(false);
        this.mostrarFormFactura.set(false);
        this.notificationService.success('Estado de factura actualizado correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.procesandoFactura.set(false);
        this.notificationService.error(err?.error?.message || 'Error al cambiar estado de factura.');
      }
    });
  }

  // ── Notas de soporte ──────────────────────────────────────────────────────
  abrirEdicionNotasSoporte(): void {
    this.notasSoporteEdit = this.orden?.notasSoporte || '';
    this.editandoNotasSoporte.set(true);
  }

  cancelarEdicionNotasSoporte(): void {
    this.editandoNotasSoporte.set(false);
  }

  guardarNotasSoporte(): void {
    if (this.guardandoNotasSoporte()) return;
    this.guardandoNotasSoporte.set(true);
    this.ordenesPruebaService.patchNotaSoporte(this.orden.documentoId, this.notasSoporteEdit).subscribe({
      next: () => {
        this.orden = { ...this.orden, notasSoporte: this.notasSoporteEdit };
        this.editandoNotasSoporte.set(false);
        this.guardandoNotasSoporte.set(false);
        this.notificationService.success('Notas de soporte actualizadas correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoNotasSoporte.set(false);
        this.notificationService.error(err?.error?.message || 'Error al guardar las notas de soporte.');
      }
    });
  }

  // ── Limpiar forms ─────────────────────────────────────────────────────────
  limpiarFormEntregable(): void {
    this.entregableForm = { codigoProducto: '', nombreProducto: '', cantidad: 1, precioUnitario: 0, observaciones: '' };
    this.busquedaProducto = '';
    this.resultadosProducto.set([]);
    this.productoSeleccionado.set(null);
  }

  limpiarFormServicio(): void {
    this.servicioForm = { codigoProducto: '', nombreProducto: '', cantidad: 1, precioUnitario: 0, observaciones: '' };
    this.busquedaServicio = '';
    this.resultadosServicio.set([]);
    this.servicioSeleccionado.set(null);
  }

  // ── Acciones de estado ────────────────────────────────────────────────────
  empezarOrden(): void {
    if (this.procesandoAccion()) return;
    this.procesandoAccion.set(true);
    this.ordenesPruebaService.patchEstado(this.orden.documentoId, 'EN_PROCESO').subscribe({
      next: (resp: any) => {
        this.orden = { ...this.orden, ...(resp || {}), estadoOrden: 'EN_PROCESO' };
        this.procesandoAccion.set(false);
        this.notificationService.success('Orden iniciada correctamente');
        this.ordenActualizada.emit();
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Empezando orden ${this.getFolio()}`)}`, '_blank');
      },
      error: (err) => {
        this.procesandoAccion.set(false);
        this.notificationService.error(err?.error?.message || 'Error al actualizar estado.');
      }
    });
  }

  finalizarOrden(): void {
    if (this.procesandoAccion()) return;
    this.procesandoAccion.set(true);
    this.ordenesPruebaService.patchEstado(this.orden.documentoId, 'FINALIZADO').subscribe({
      next: (resp: any) => {
        this.orden = { ...this.orden, ...(resp || {}), estadoOrden: 'FINALIZADO' };
        this.procesandoAccion.set(false);
        this.notificationService.success('Orden finalizada correctamente');
        this.ordenActualizada.emit();
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Orden finalizada ${this.getFolio()}`)}`, '_blank');
      },
      error: (err) => {
        this.procesandoAccion.set(false);
        this.notificationService.error(err?.error?.message || 'Error al finalizar.');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getFolio(): string { return `ORD-${(this.orden?.documentoId ?? 0).toString().padStart(6, '0')}`; }
  getCantidadServicios():   number { return this.serviciosDetalle().length; }
  getCantidadEntregables(): number { return this.entregablesDetalle().length; }

  getTotalHoras(): string {
    const h = Number(this.orden?.totalHoras || 0);
    return h > 0 ? `${h.toFixed(2)} hrs` : 'Sin registro';
  }

  formatearDinero(valor: number | string | null | undefined, decimales = 2): string {
    if (valor == null || valor === '') return '$0.00';
    const n = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(n) || !isFinite(n)) return '$0.00';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);
  }

  private toTitleCase(v: string): string {
    return v.split(' ').filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  getIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  getColorAvatar(nombre: string): string {
    const colores = [
      'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
      'bg-pink-500',  'bg-rose-500',   'bg-orange-500',
      'bg-amber-500', 'bg-teal-500',   'bg-cyan-500',
      'bg-emerald-500'
    ];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  getNombresAuxiliaresTexto(nombres: string[]): string {
    return nombres.join(', ');
  }

  getContactoVisual(valor: string | null | undefined): string {
    const texto = (valor || '').trim();
    return texto || 'Correo: , Whatsapp:';
  }

  getCredencialesVisual(valor: string | null | undefined): string {
    const texto = (valor || '').trim();
    return texto || 'TeamViewer, id: , password:';
  }
}