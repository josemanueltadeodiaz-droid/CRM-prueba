import {
  Component, Input, Output, EventEmitter,
  signal, computed, OnInit, OnDestroy, inject,
  ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UiBotonComponent } from '../../../../../shared/atoms/boton/boton.component';

import { OrdenServicioPruebasService, OrdenServicioPruebaItem } from '../../../../../core/services/orden-servicio.servicePrueba';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { AgenteLegacyService } from '../../../../../core/services/agente-legacy.service';
import { ClienteLegacyResponse } from '../../../../../core/models/cliente-legacy.interface';
import { NotificationService } from '../../../../../core/services/notification.service';

declare const google: any;

type ClienteBusqueda = { idCliente: number; razonSocial: string; rfc?: string; ubicacion?: string };

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
  private clienteLegacyService = inject(ClienteLegacyService);
  private agenteLegacyService  = inject(AgenteLegacyService);
  private sanitizer            = inject(DomSanitizer);
  private notificationService  = inject(NotificationService);

  visible         = signal<boolean>(false);
  cargando        = signal<boolean>(false);
  monstrarDatos   = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);

  serviciosDetalle   = signal<any[]>([]);
  entregablesDetalle = signal<any[]>([]);

  datosCliente    = signal<ClienteLegacyResponse | null>(null);
  cargandoCliente = signal<boolean>(false);

  agentePrincipalNombre    = signal<string>('Sin asignar');
  agentesAuxiliaresNombres = signal<string[]>([]);

  mapaUrl = signal<SafeResourceUrl | null>(null);

  // ── Mapa de agentes disponibles para edición ──────────────────────────────
  agentesMap      = signal<Record<number, string>>({});
  agentesDisponibles = computed(() =>
    Object.entries(this.agentesMap())
      .map(([id, nombre]) => ({ id: Number(id), nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  // ── Estado de edición ─────────────────────────────────────────────────────
  esOrdenFinalizada = computed(() =>
    (this.orden?.estadoOrden || '').toUpperCase() === 'FINALIZADO'
  );

  editandoObservaciones    = signal<boolean>(false);
  editandoAgentePrincipal  = signal<boolean>(false);
  editandoAuxiliares       = signal<boolean>(false);

  guardandoObservaciones   = signal<boolean>(false);
  guardandoAgentePrincipal = signal<boolean>(false);
  guardandoAuxiliares      = signal<boolean>(false);

  // Valores editables (se inicializan al abrir cada sección)
  observacionesEdit    = '';
  agentePrincipalEdit  = 0;
  auxiliaresEdit       = signal<number[]>([]);

  // ── Edición de dirección ──────────────────────────────────────────────────
  @ViewChild('mapContainerVista') mapContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInputVista') searchInputRef!: ElementRef<HTMLInputElement>;

  editandoDireccion  = signal<boolean>(false);
  guardandoDireccion = signal<boolean>(false);
  direccionEdit = { direccionGoogleMaps: '', latitud: null as number | null, longitud: null as number | null };
  busquedaMapa = '';

  private map: any;
  private marker: any;
  private geocoder: any;
  private autocomplete: any;
  private autocompleteInited = false;
  private mapInitAttempts = 0;
  private readonly maxMapInitAttempts = 30;
  private readonly DURANGO_CENTER = { lat: 24.0277, lng: -104.6532 };

  // ── Edición de solicitante y destinatario ─────────────────────────────────
  editandoSolicitante  = signal<boolean>(false);
  guardandoSolicitante = signal<boolean>(false);
  solicitanteEdit = {
    nombreSolicitante:    '',
    nombreDestinatario:   '',
    contactoSolicitante:  '',
    contactoDestinatario: '',
  };

  abrirEdicionSolicitante(): void {
    this.solicitanteEdit = {
      nombreSolicitante:    this.orden?.nombreSolicitante    || '',
      nombreDestinatario:   this.orden?.nombreDestinatario   || '',
      contactoSolicitante:  this.orden?.contactoSolicitante  || '',
      contactoDestinatario: this.orden?.contactoDestinatario || '',
    };
    this.editandoSolicitante.set(true);
  }

  cancelarEdicionSolicitante(): void {
    this.editandoSolicitante.set(false);
  }

  guardarSolicitante(): void {
    if (this.guardandoSolicitante()) return;
    this.guardandoSolicitante.set(true);
    this.ordenesPruebaService.patchSolicitanteDestinatario(this.orden.documentoId, this.solicitanteEdit).subscribe({
      next: () => {
        this.orden = { ...this.orden, ...this.solicitanteEdit };
        this.editandoSolicitante.set(false);
        this.guardandoSolicitante.set(false);
        this.notificationService.success('Solicitante y destinatario actualizados correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoSolicitante.set(false);
        const msg = err?.error?.message || 'Error al guardar solicitante y destinatario';
        this.notificationService.error(msg);
      }
    });
  }

  // ── Edición de credenciales ───────────────────────────────────────────────
  editandoCredenciales  = signal<boolean>(false);
  guardandoCredenciales = signal<boolean>(false);
  credencialesIdEdit       = '';
  credencialesPasswordEdit = '';

  /** Extrae el ID de TeamViewer del texto almacenado, si está en el formato estándar. */
  private parseCredencialesId(val: string | null | undefined): string {
    if (!val) return '';
    const m = val.match(/TeamViewer\s*ID\s*:\s*([^,]+)/i);
    return m ? m[1].trim() : '';
  }

  /** Extrae el password de TeamViewer del texto almacenado. */
  private parseCredencialesPassword(val: string | null | undefined): string {
    if (!val) return '';
    const m = val.match(/password\s*:\s*(.+)/i);
    return m ? m[1].trim() : '';
  }

  abrirEdicionCredenciales(): void {
    const raw = this.orden?.credencialesEscritas || '';
    this.credencialesIdEdit       = this.parseCredencialesId(raw)       || raw;
    this.credencialesPasswordEdit = this.parseCredencialesPassword(raw) || '';
    this.editandoCredenciales.set(true);
  }

  cancelarEdicionCredenciales(): void {
    this.editandoCredenciales.set(false);
  }

  guardarCredenciales(): void {
    if (this.guardandoCredenciales()) return;
    const credencialesEscritas = `TeamViewer ID: ${this.credencialesIdEdit.trim()}, password: ${this.credencialesPasswordEdit.trim()}`;
    this.guardandoCredenciales.set(true);
    this.ordenesPruebaService.patchCredenciales(this.orden.documentoId, credencialesEscritas).subscribe({
      next: () => {
        this.orden = { ...this.orden, credencialesEscritas };
        this.editandoCredenciales.set(false);
        this.guardandoCredenciales.set(false);
        this.notificationService.success('Credenciales actualizadas correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoCredenciales.set(false);
        const msg = err?.error?.message || 'Error al guardar las credenciales';
        this.notificationService.error(msg);
      }
    });
  }

  // ── Edición de cliente ────────────────────────────────────────────────────
  editandoCliente  = signal<boolean>(false);
  guardandoCliente = signal<boolean>(false);
  busquedaClienteEdit  = '';
  clientesResultados   = signal<ClienteBusqueda[]>([]);
  loadingClientesEdit  = signal<boolean>(false);
  clienteEditId        = 0;

  private clienteSearch$ = new Subject<string>();
  private destroy$       = new Subject<void>();

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
  tipoAtencionClase = computed(() =>
    this.orden?.esVirtual ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.visible.set(true);
    this.cargarDetalleOrden();
    this.initClienteSearch();
  }

  ngOnDestroy() {
    this.visible.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

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

        const todos: any[]         = resp?.entregables || [];
        const TIPOS_SERVICIO       = ['SERVICIO_ASESORIA', 'SERVICIO', 'ASESORIA'];
        const serviciosLegacy: any[] = resp?.servicios || [];

        this.serviciosDetalle.set([
          ...todos.filter(e => TIPOS_SERVICIO.includes((e.tipo || '').toUpperCase())),
          ...serviciosLegacy
        ]);
        this.entregablesDetalle.set(
          todos.filter(e => !TIPOS_SERVICIO.includes((e.tipo || '').toUpperCase()))
        );

        this.construirMapa();
        this.cargarNombresAgentes();
        this.cargarDatosCliente();
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

  cargarDatosCliente() {
    const idCliente = (this.orden as any)?.idCliente;
    if (!idCliente) return;
    this.cargandoCliente.set(true);
    this.clienteLegacyService.obtenerPorId(idCliente).subscribe({
      next: (c) => { this.datosCliente.set(c); this.cargandoCliente.set(false); },
      error: (err) => {
        this.cargandoCliente.set(false);
        if (err?.status === 401) {
          this.notificationService.error('Sesión expirada. Por favor, inicie sesión de nuevo.');
        }
      }
    });
  }

  cargarNombresAgentes() {
    this.agenteLegacyService.getAllAgentesMap().subscribe({
      next: (map) => {
        this.agentesMap.set(map);

        const pid = Number(this.orden?.idAgentePrincipal ?? this.orden?.agentePrincipal);
        this.agentePrincipalNombre.set(map[pid] || 'Agente no encontrado');

        const auxIds = this.parseAuxiliares(this.orden?.agenteAuxiliar);
        this.agentesAuxiliaresNombres.set(auxIds.map(id => map[id] || 'Agente no encontrado'));
      },
      error: () => {}
    });
  }

  // ── Edición de observaciones ──────────────────────────────────────────────
  abrirEdicionObservaciones(): void {
    this.observacionesEdit = this.orden?.observaciones || '';
    this.editandoObservaciones.set(true);
  }

  cancelarEdicionObservaciones(): void {
    this.editandoObservaciones.set(false);
  }

  guardarObservaciones(): void {
    if (this.guardandoObservaciones()) return;
    this.guardandoObservaciones.set(true);
    this.ordenesPruebaService.patchObservaciones(this.orden.documentoId, this.observacionesEdit).subscribe({
      next: () => {
        this.orden = { ...this.orden, observaciones: this.observacionesEdit };
        this.editandoObservaciones.set(false);
        this.guardandoObservaciones.set(false);
        this.notificationService.success('Observaciones actualizadas correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoObservaciones.set(false);
        const msg = err?.error?.message || 'Error al guardar las observaciones';
        this.notificationService.error(msg);
      }
    });
  }

  // ── Edición de agente principal ───────────────────────────────────────────
  abrirEdicionAgentePrincipal(): void {
    this.agentePrincipalEdit = Number(this.orden?.idAgentePrincipal ?? this.orden?.agentePrincipal ?? 0);
    this.editandoAgentePrincipal.set(true);
  }

  cancelarEdicionAgentePrincipal(): void {
    this.editandoAgentePrincipal.set(false);
  }

  guardarAgentePrincipal(): void {
    if (this.guardandoAgentePrincipal() || !this.agentePrincipalEdit) return;
    this.guardandoAgentePrincipal.set(true);
    this.ordenesPruebaService.patchAgentePrincipal(this.orden.documentoId, this.agentePrincipalEdit).subscribe({
      next: () => {
        this.orden = { ...this.orden, idAgentePrincipal: this.agentePrincipalEdit, agentePrincipal: this.agentePrincipalEdit };
        const nombre = this.agentesMap()[this.agentePrincipalEdit] || `Agente #${this.agentePrincipalEdit}`;
        this.agentePrincipalNombre.set(nombre);
        this.editandoAgentePrincipal.set(false);
        this.guardandoAgentePrincipal.set(false);
        this.notificationService.success('Agente principal actualizado correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoAgentePrincipal.set(false);
        const msg = err?.error?.message || 'Error al guardar el agente principal';
        this.notificationService.error(msg);
      }
    });
  }

  // ── Edición de agentes auxiliares ────────────────────────────────────────
  abrirEdicionAuxiliares(): void {
    const ids = this.parseAuxiliares(this.orden?.agenteAuxiliar);
    this.auxiliaresEdit.set(ids);
    this.editandoAuxiliares.set(true);
  }

  cancelarEdicionAuxiliares(): void {
    this.editandoAuxiliares.set(false);
  }

  toggleAuxiliar(id: number): void {
    const current = this.auxiliaresEdit();
    if (current.includes(id)) {
      this.auxiliaresEdit.set(current.filter(x => x !== id));
    } else {
      this.auxiliaresEdit.set([...current, id]);
    }
  }

  esAuxiliarSeleccionado(id: number): boolean {
    return this.auxiliaresEdit().includes(id);
  }

  guardarAuxiliares(): void {
    if (this.guardandoAuxiliares()) return;
    this.guardandoAuxiliares.set(true);
    const ids = this.auxiliaresEdit();
    this.ordenesPruebaService.patchAgentesAuxiliares(this.orden.documentoId, ids).subscribe({
      next: () => {
        const csvValue = ids.join(',');
        this.orden = { ...this.orden, agenteAuxiliar: csvValue || null };
        const map = this.agentesMap();
        this.agentesAuxiliaresNombres.set(ids.map(id => map[id] || 'Agente no encontrado'));
        this.editandoAuxiliares.set(false);
        this.guardandoAuxiliares.set(false);
        this.notificationService.success('Agentes auxiliares actualizados correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoAuxiliares.set(false);
        const msg = err?.error?.message || 'Error al guardar los agentes auxiliares';
        this.notificationService.error(msg);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private parseAuxiliares(value: string | null | undefined): number[] {
    if (!value) return [];
    return value.split(',').map(x => Number(x.trim())).filter(x => !isNaN(x) && x > 0);
  }

  private construirMapa(): void {
    const lat = this.orden?.latitud;
    const lng = this.orden?.longitud;
    if (lat == null || lng == null) { this.mapaUrl.set(null); return; }
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    this.mapaUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  // ── Helpers avatar ────────────────────────────────────────────────────────
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

  // ── Helpers de formato ────────────────────────────────────────────────────
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getFolio(): string {
    return `ORD-${(this.orden?.documentoId ?? 0).toString().padStart(6, '0')}`;
  }

  getCantidadServicios():   number { return this.serviciosDetalle().length; }
  getCantidadEntregables(): number { return this.entregablesDetalle().length; }

  // Formato 00h 00mm
  getTotalHoras(): string {
    const h = Number(this.orden?.totalHoras || 0);
    if (h <= 0) return 'Sin registro';
    const horas   = Math.floor(h);
    const minutos = Math.round((h - horas) * 60);
    const hh = horas.toString().padStart(2, '0');
    const mm = minutos.toString().padStart(2, '0');
    return `${hh}h ${mm}mm`;
  }

  formatearDinero(valor: number | string | null | undefined, decimales = 2): string {
    if (valor == null || valor === '') return '$0.00';
    const n = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(n) || !isFinite(n)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN',
      minimumFractionDigits: decimales, maximumFractionDigits: decimales
    }).format(n);
  }

  private toTitleCase(v: string): string {
    return v.split(' ').filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  getMapsUrl(): string {
    const lat = this.orden?.latitud;
    const lng = this.orden?.longitud;
    if (lat == null || lng == null) return '';
    return `https://www.google.com/maps?q=${lat},${lng}&z=16`;
  }

  getStaticMapUrl(): string {
    const lat = this.orden?.latitud;
    const lng = this.orden?.longitud;
    if (lat == null || lng == null) return '';
    const apiKey = 'AIzaSyCLbE0AW3nsURfATbi4fkjZ8GAakjcYch0';
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=520x220&scale=2&markers=color:blue%7Clabel:%20%7C${lat},${lng}&key=${apiKey}`;
  }

  getNombresAuxiliaresTexto(nombres: string[]): string {
    return nombres.join(', ');
  }

  // ── Edición de dirección ──────────────────────────────────────────────────
  abrirEdicionDireccion(): void {
    this.direccionEdit = {
      direccionGoogleMaps: this.orden?.direccionGoogleMaps || '',
      latitud: this.orden?.latitud ?? null,
      longitud: this.orden?.longitud ?? null,
    };
    this.busquedaMapa = this.orden?.direccionGoogleMaps || '';
    this.autocompleteInited = false;
    this.map = null;
    this.marker = null;
    this.editandoDireccion.set(true);
    setTimeout(() => this.tryInitMapWithRetry(), 0);
  }

  cancelarEdicionDireccion(): void {
    this.editandoDireccion.set(false);
    this.map = null;
    this.marker = null;
  }

  guardarDireccion(): void {
    if (this.guardandoDireccion()) return;
    const { direccionGoogleMaps, latitud, longitud } = this.direccionEdit;
    if (!direccionGoogleMaps?.trim()) {
      this.notificationService.error('La dirección no puede estar vacía');
      return;
    }
    if (latitud == null || longitud == null) {
      this.notificationService.error('Selecciona una ubicación en el mapa');
      return;
    }
    this.guardandoDireccion.set(true);
    this.ordenesPruebaService.patchDireccion(this.orden.documentoId, {
      direccionGoogleMaps: direccionGoogleMaps.trim(),
      latitud,
      longitud,
    }).subscribe({
      next: () => {
        this.orden = { ...this.orden, direccionGoogleMaps: direccionGoogleMaps.trim(), latitud, longitud };
        this.construirMapa();
        this.editandoDireccion.set(false);
        this.guardandoDireccion.set(false);
        this.map = null;
        this.marker = null;
        this.notificationService.success('Dirección actualizada correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoDireccion.set(false);
        const msg = err?.error?.message || 'Error al guardar la dirección';
        this.notificationService.error(msg);
      }
    });
  }

  private tryInitMapWithRetry(): void {
    const el = this.mapContainerRef?.nativeElement;
    const hasGoogle = !!(window as any)?.google?.maps;
    const readyEl = !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
    if (!hasGoogle || !readyEl) {
      this.mapInitAttempts++;
      if (this.mapInitAttempts <= this.maxMapInitAttempts) setTimeout(() => this.tryInitMapWithRetry(), 250);
      return;
    }
    this.mapInitAttempts = 0;
    this.initInteractiveMap();
  }

  private initInteractiveMap(): void {
    if (!this.mapContainerRef?.nativeElement || !(window as any)?.google?.maps) return;
    const center = this.direccionEdit.latitud != null && this.direccionEdit.longitud != null
      ? { lat: this.direccionEdit.latitud, lng: this.direccionEdit.longitud }
      : this.DURANGO_CENTER;

    if (!this.map) {
      this.map = new google.maps.Map(this.mapContainerRef.nativeElement, {
        center, zoom: 15,
        mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, rotateControl: false, scaleControl: false
      });
      this.geocoder = new google.maps.Geocoder();
      this.marker = new google.maps.Marker({
        position: center, map: this.map, draggable: true, title: 'Ubicación'
      });
      this.map.addListener('click', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));
      this.marker.addListener('dragend', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));
    } else {
      this.map.setCenter(this.marker?.getPosition() || center);
    }
    setTimeout(() => {
      if (this.map) google.maps.event.trigger(this.map, 'resize');
      this.initAutocomplete();
    }, 100);
  }

  private initAutocomplete(): void {
    const input = this.searchInputRef?.nativeElement;
    if (!input || !(window as any)?.google?.maps?.places || this.autocompleteInited) return;
    this.autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'mx' },
      fields: ['formatted_address', 'geometry', 'place_id', 'name']
    });
    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete.getPlace();
      if (!place?.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      this.direccionEdit.latitud = lat;
      this.direccionEdit.longitud = lng;
      this.direccionEdit.direccionGoogleMaps = place.formatted_address || place.name || `${lat}, ${lng}`;
      this.busquedaMapa = place.formatted_address || place.name || '';
      this.setMarkerAndCenter({ lat, lng });
    });
    this.autocompleteInited = true;
  }

  private updateLocationFromLatLng(lat: number, lng: number): void {
    this.direccionEdit.latitud = lat;
    this.direccionEdit.longitud = lng;
    this.setMarkerAndCenter({ lat, lng });
    if (!this.geocoder && (window as any)?.google?.maps) this.geocoder = new google.maps.Geocoder();
    if (!this.geocoder) return;
    this.geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results?.length) {
        this.direccionEdit.direccionGoogleMaps = results[0].formatted_address || this.direccionEdit.direccionGoogleMaps;
        this.busquedaMapa = results[0].formatted_address || '';
      } else {
        this.direccionEdit.direccionGoogleMaps = `${lat}, ${lng}`;
        this.busquedaMapa = `${lat}, ${lng}`;
      }
    });
  }

  private setMarkerAndCenter(pos: { lat: number; lng: number }): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setPosition(pos);
    } else {
      this.marker = new google.maps.Marker({ position: pos, map: this.map, draggable: true });
      this.marker.addListener('dragend', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));
    }
    this.map.setCenter(pos);
    try { this.map.setZoom(16); } catch {}
  }

  // ── Edición de cliente ────────────────────────────────────────────────────
  abrirEdicionCliente(): void {
    this.busquedaClienteEdit = '';
    this.clientesResultados.set([]);
    this.clienteEditId = (this.orden as any)?.idCliente || 0;
    this.editandoCliente.set(true);
  }

  cancelarEdicionCliente(): void {
    this.editandoCliente.set(false);
  }

  onBusquedaClienteInput(): void {
    this.clienteSearch$.next(this.busquedaClienteEdit);
  }

  private initClienteSearch(): void {
    this.clienteSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        const query = (q || '').trim();
        if (query.length < 2) {
          this.clientesResultados.set([]);
          this.loadingClientesEdit.set(false);
          return of(null);
        }
        this.loadingClientesEdit.set(true);
        return this.clienteLegacyService.buscarSimplificado(query).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.loadingClientesEdit.set(false);
      if (res) {
        this.clientesResultados.set((res?.data || []).map((c: any) => ({
          idCliente: c.idCliente ?? c.id ?? 0,
          razonSocial: c.razonSocial || c.nombre || '',
          rfc: c.rfc || '',
          ubicacion: c.ubicacion || c.direccion || '',
        })));
      }
    });
  }

  seleccionarClienteEdit(cliente: ClienteBusqueda): void {
    this.clienteEditId = cliente.idCliente;
    this.busquedaClienteEdit = cliente.razonSocial;
    this.clientesResultados.set([]);
  }

  guardarCliente(): void {
    if (this.guardandoCliente() || !this.clienteEditId || this.clienteEditId <= 0) return;
    this.guardandoCliente.set(true);
    this.ordenesPruebaService.patchCliente(this.orden.documentoId, this.clienteEditId).subscribe({
      next: (resp: any) => {
        this.orden = { ...this.orden, idCliente: this.clienteEditId };
        this.editandoCliente.set(false);
        this.guardandoCliente.set(false);
        this.cargarDatosCliente();
        this.notificationService.success('Cliente actualizado correctamente');
        this.ordenActualizada.emit();
      },
      error: (err) => {
        this.guardandoCliente.set(false);
        const msg = err?.error?.message || 'Error al guardar el cliente';
        this.notificationService.error(msg);
      }
    });
  }
}