import {
  Component, Output, EventEmitter, signal, Input,
  OnInit, OnChanges, OnDestroy, SimpleChanges, inject, ElementRef,
  ViewChild, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { UiHeaderModal } from '../../../../../shared/molecules/headerModal/header-modal.component';
import { UiBotonComponent } from '../../../../../shared/atoms/boton/boton.component';
import { OrdenServicioPruebasService } from '../../../../../core/services/orden-servicio.servicePrueba';
import { AgenteLegacyService } from '../../../../../core/services/agente-legacy.service';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { HttpErrorResponse } from '@angular/common/http';
import { UiDialogAlertComponent } from '../../../../../shared/organisms/dialogAlert/dialogAlert.component';

declare const google: any;

type CreateOSPayload = {
  documentoId: number; esVirtual: boolean; agentePrincipal: number;
  agenteAuxiliar: string | null; tituloEvento: string; fechaStart: string;
  fechaEnd: string; nombreSolicitante: string; nombreDestinatario: string;
  contactoSolicitante: string; contactoDestinatario: string; urlImagen: string;
  credencialesEscritas: string; estadoFactura: 'PENDIENTE' | 'CONFACTURA' | 'SIN_FACTURA';
  direccionGoogleMaps: string; googlePlaceId: string;
  latitud: number | null; longitud: number | null; observaciones: string;
  calendario?: { agregar: boolean; tipo?: 'bloque' | 'todoDia'; inicio?: string | null; fin?: string | null; dia?: string | null };
  clienteId?: number | null;
};

type AgenteOption = { id: number; nombre: string; telefono?: string | null; };
type ClienteBusqueda = { idCliente: number; razonSocial: string; rfc?: string; ubicacion?: string; lat?: number | null; lng?: number | null };

@Component({
  selector: 'app-dialog-crear-orden-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule, UiHeaderModal, UiBotonComponent, UiDialogAlertComponent],
  templateUrl: './dialog.crear-misOrdnesServicio.component.html',
})
export class DialogCrearMisOrdenesServicios implements OnInit, OnChanges, OnDestroy {
  @Input() abrir = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() ordenCreada = new EventEmitter<any>();
  @Output() modalCerrado = new EventEmitter<void>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  private ordenesService = inject(OrdenServicioPruebasService);
  private agenteLegacyService = inject(AgenteLegacyService);
  private clienteLegacyService = inject(ClienteLegacyService);

  visible = signal(false);
  cargando = signal(false);
  cargandoAgentes = signal(false);

  clienteSeleccionado: ClienteBusqueda | null = null;
  busquedaCliente = '';
  clientesResultados: ClienteBusqueda[] = [];
  loadingClientes = false;

  private clienteSearch$ = new Subject<string>();
  private destroy$       = new Subject<void>();

  showAddressConfirm = false;
  addressConfirmTitle = '';
  addressConfirmText = '';
  private pendingAddressFromClient = '';

  mostrarBuscadorDireccion = false;

  metodoAccesoVirtual: 'credenciales' = 'credenciales';
  destinatarioTieneCorreo = false;
  destinatarioTieneTelefonos = false;
  destinatarioCorreo = '';
  destinatarioTelefonoFijo = '';
  destinatarioWhatsapp = '';

  agentes: AgenteOption[] = [];
  mostrarDropdownAuxiliares = false;
  auxiliaresSeleccionados: number[] = [];

  private map: any;
  private marker: any;
  private geocoder: any;
  private autocomplete: any;
  private autocompleteInited = false;
  private mapInitAttempts = 0;
  private maxMapInitAttempts = 30;

  private readonly DURANGO_CENTER = { lat: 24.0277, lng: -104.6532 };

  agregarEventoCalendario = false;
  tipoEventoCalendario: 'bloque' | 'todoDia' = 'bloque';
  calendarioDia: string = '';
  calendarioInicio: string = '';
  calendarioFin: string = '';

  teamViewerId: string = '';
  teamViewerPassword: string = '';

  model = {
    esVirtual: true, agentePrincipal: 0,
    tituloEvento: '', fechaStart: '', fechaEnd: '',
    nombreSolicitante: '', nombreDestinatario: '',
    contactoSolicitante: '', contactoDestinatario: '',
    urlImagen: '', credencialesEscritas: '',
    direccionGoogleMaps: '', googlePlaceId: '',
    latitud: null as number | null, longitud: null as number | null,
    observaciones: ''
  };

  busquedaMapa = '';

  showConfirm = false;
  confirmTitulo = '';
  confirmParrafo = '';
  private pendingPayload: CreateOSPayload | null = null;
  private pendingTeamViewerId = '';
  private pendingTeamViewerPassword = '';

  ngOnInit(): void {
    this.initClienteSearch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abrir']?.currentValue === true) {
      this.visible.set(true);
      this.resetForm();
      this.cargarAgentes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click')
  onDocClick(): void { this.mostrarDropdownAuxiliares = false; }

  get agentesAuxiliaresDisponibles(): AgenteOption[] {
    return this.agentes.filter(a => a.id !== Number(this.model.agentePrincipal));
  }

  onAgentePrincipalChange(): void {
    const p = Number(this.model.agentePrincipal);
    this.auxiliaresSeleccionados = this.auxiliaresSeleccionados.filter(id => id !== p);
  }

  onTipoAtencionChange(esVirtual: boolean): void {
    this.model.esVirtual = esVirtual;
    if (!esVirtual) setTimeout(() => this.tryInitMapWithRetry(), 0);
  }

  private cargarAgentes(): void {
    this.cargandoAgentes.set(true);
    this.agenteLegacyService.getUsuariosEnlazados().subscribe({
      next: (data: any[]) => {
        this.agentes = (data || [])
          .filter((u: any) => Number(u.idAgenteLegacy) > 0)
          .map((u: any) => ({
            id: Number(u.idAgenteLegacy),
            nombre: (u.nombreAgenteLegacy || '').trim(),
            telefono: (u.telefono || '').toString().trim()
          }));
        this.cargandoAgentes.set(false);
      },
      error: () => { this.agentes = []; this.cargandoAgentes.set(false); }
    });
  }

  toggleDropdownAuxiliares(event: Event): void {
    event.stopPropagation();
    this.mostrarDropdownAuxiliares = !this.mostrarDropdownAuxiliares;
  }

  toggleAuxiliar(event: Event, id: number): void {
    event.stopPropagation();
    if (id === Number(this.model.agentePrincipal)) return;
    const idx = this.auxiliaresSeleccionados.indexOf(id);
    if (idx >= 0) this.auxiliaresSeleccionados.splice(idx, 1);
    else this.auxiliaresSeleccionados.push(id);
  }

  estaAuxiliarSeleccionado(id: number): boolean {
    return this.auxiliaresSeleccionados.includes(id);
  }

  get textoAuxiliaresSeleccionados(): string {
    if (!this.auxiliaresSeleccionados.length) return 'Seleccionar auxiliares';
    return this.agentes
      .filter(a => this.auxiliaresSeleccionados.includes(a.id))
      .map(a => a.nombre).join(', ');
  }

  onBusquedaClienteInput(): void {
    this.clienteSearch$.next(this.busquedaCliente);
  }

  buscarClientes(): void {
    // Trigger inmediato al pulsar el botón (sin debounce)
    const q = (this.busquedaCliente || '').trim();
    if (q.length < 2) { this.clientesResultados = []; return; }
    this.loadingClientes = true;
    this.clienteLegacyService.buscarSimplificado(q).subscribe({
      next: (res: any) => {
        this.loadingClientes = false;
        this.clientesResultados = (res?.data || []).map((c: any) => ({
          idCliente: c.idCliente ?? c.id ?? 0,
          razonSocial: c.razonSocial || c.nombre || '',
          rfc: c.rfc || '',
          ubicacion: c.ubicacion || c.direccion || '',
          lat: c.latitud ?? c.lat ?? null,
          lng: c.longitud ?? c.lng ?? null
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.loadingClientes = false;
        this.clientesResultados = [];
        console.error('Error buscando clientes', err);
      }
    });
  }

  private initClienteSearch(): void {
    this.clienteSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        const query = (q || '').trim();
        if (query.length < 2) {
          this.clientesResultados = [];
          this.loadingClientes = false;
          return of(null);
        }
        this.loadingClientes = true;
        return this.clienteLegacyService.buscarSimplificado(query).pipe(
          catchError(() => of(null))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.loadingClientes = false;
      if (res) {
        this.clientesResultados = (res?.data || []).map((c: any) => ({
          idCliente: c.idCliente ?? c.id ?? 0,
          razonSocial: c.razonSocial || c.nombre || '',
          rfc: c.rfc || '',
          ubicacion: c.ubicacion || c.direccion || '',
          lat: c.latitud ?? c.lat ?? null,
          lng: c.longitud ?? c.lng ?? null
        }));
      }
    });
  }

  seleccionarCliente(cliente: ClienteBusqueda): void {
    this.clienteSeleccionado = cliente;
    this.mostrarBuscadorDireccion = false;

    if (this.model.esVirtual) {
      this.model.direccionGoogleMaps = cliente.ubicacion || '';
      this.model.googlePlaceId = '';
      this.model.latitud = cliente.lat ?? null;
      this.model.longitud = cliente.lng ?? null;
      this.busquedaMapa = '';
      return;
    }

    const address = (cliente.ubicacion || '').trim();
    if (!address) {
      this.model.direccionGoogleMaps = '';
      this.model.googlePlaceId = '';
      this.model.latitud = null;
      this.model.longitud = null;
      this.busquedaMapa = '';

      this.addressConfirmTitle = 'Cliente sin ubicación registrada';
      this.addressConfirmText = 'Este cliente no tiene dirección guardada. ¿Quieres capturar una dirección ahora?';
      this.showAddressConfirm = true;
      setTimeout(() => this.tryInitMapWithRetry(), 0);
      return;
    }

    this.model.direccionGoogleMaps = address;
    this.model.googlePlaceId = '';
    this.model.latitud = cliente.lat ?? null;
    this.model.longitud = cliente.lng ?? null;
    this.busquedaMapa = address;

    this.pendingAddressFromClient = address;
    this.addressConfirmTitle = 'Dirección encontrada';
    this.addressConfirmText = 'Se cargó la dirección del cliente. ¿Quieres modificarla?';
    this.showAddressConfirm = true;

    setTimeout(() => {
      this.tryInitMapWithRetry();
      this.trySearchClientAddressWithPlaces(address);
    }, 0);
  }

  preguntarModificarDireccion(): void {
    if (!this.clienteSeleccionado) return;
    this.mostrarBuscadorDireccion = false;
    this.addressConfirmTitle = 'Modificar dirección';
    this.addressConfirmText = '¿Quieres modificar la dirección del cliente tempral?';
    this.showAddressConfirm = true;
  }

  onAddressConfirmAccept(): void {
    this.showAddressConfirm = false;
    this.mostrarBuscadorDireccion = true;

    if (!this.model.esVirtual) {
      setTimeout(() => {
        this.tryInitMapWithRetry();
        setTimeout(() => {
          this.initAutocomplete(true);
          this.searchInputRef?.nativeElement?.focus();
        }, 80);
      }, 0);
    }
  }

  onAddressConfirmCancel(): void {
    this.showAddressConfirm = false;
    this.mostrarBuscadorDireccion = false;

    if (this.pendingAddressFromClient) {
      this.model.direccionGoogleMaps = this.pendingAddressFromClient;
      this.busquedaMapa = this.pendingAddressFromClient;
      this.pendingAddressFromClient = '';
    }
  }

  private trySearchClientAddressWithPlaces(address: string, attempt = 0): void {
    if (!address) return;

    const hasPlaces = !!(window as any)?.google?.maps?.places;
    if (!hasPlaces) {
      if (attempt < this.maxMapInitAttempts) {
        setTimeout(() => this.trySearchClientAddressWithPlaces(address, attempt + 1), 300);
      } else {
        this.tryGeocodeClientAddress(address);
      }
      return;
    }

    try {
      const placesServiceTarget = this.map || this.mapContainerRef?.nativeElement || document.createElement('div');
      const placesService = new google.maps.places.PlacesService(placesServiceTarget);

      const request = {
        query: address,
        fields: ['formatted_address', 'geometry', 'place_id', 'name']
      };

      placesService.findPlaceFromQuery(request, (results: any[], status: string) => {
        const okStatus = (google?.maps?.places?.PlacesServiceStatus && status === google.maps.places.PlacesServiceStatus.OK) || status === 'OK';
        if (okStatus && results && results.length) {
          const r = results[0];
          const lat = r.geometry?.location?.lat?.() ?? null;
          const lng = r.geometry?.location?.lng?.() ?? null;
          this.model.direccionGoogleMaps = r.formatted_address || r.name || address;
          this.model.googlePlaceId = r.place_id || '';
          this.model.latitud = lat;
          this.model.longitud = lng;
          this.busquedaMapa = this.model.direccionGoogleMaps;
          if (this.map) this.setMarkerAndCenter({ lat: lat ?? this.DURANGO_CENTER.lat, lng: lng ?? this.DURANGO_CENTER.lng });
        } else {
          this.tryGeocodeClientAddress(address);
        }
      });
    } catch (ex) {
      console.warn('Error usando Places.findPlaceFromQuery, haciendo geocode:', ex);
      this.tryGeocodeClientAddress(address);
    }
  }

  private tryGeocodeClientAddress(address: string, attempt = 0): void {
    if (!address) return;
    const hasGoogle = !!(window as any)?.google?.maps;
    if (!hasGoogle) {
      if (attempt < this.maxMapInitAttempts) {
        setTimeout(() => this.tryGeocodeClientAddress(address, attempt + 1), 300);
      } else {
        console.warn('Google Maps no disponible para geocoding');
      }
      return;
    }

    if (!this.geocoder) this.geocoder = new google.maps.Geocoder();

    this.geocoder.geocode({ address }, (results: any[], status: string) => {
      if (status === 'OK' && results?.length) {
        const best = results[0];
        const lat = best.geometry.location.lat();
        const lng = best.geometry.location.lng();
        this.model.latitud = lat;
        this.model.longitud = lng;
        this.model.direccionGoogleMaps = best.formatted_address || this.model.direccionGoogleMaps;
        this.model.googlePlaceId = best.place_id || '';
        this.busquedaMapa = this.model.direccionGoogleMaps;
        if (this.map && this.marker) this.setMarkerAndCenter({ lat, lng });
      } else {
        console.warn('No se pudo geocodificar dirección del cliente:', status);
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

    const center = this.model.latitud !== null && this.model.longitud !== null
      ? { lat: this.model.latitud, lng: this.model.longitud }
      : this.DURANGO_CENTER;

    if (!this.map) {
      this.map = new google.maps.Map(this.mapContainerRef.nativeElement, {
        center, zoom: 13,
        mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, rotateControl: false, scaleControl: false
      });

      this.geocoder = new google.maps.Geocoder();

      this.marker = new google.maps.Marker({
        position: center, map: this.map,
        draggable: true, title: 'Ubicación de la orden'
      });

      this.map.addListener('click', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));
      this.marker.addListener('dragend', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));

      if (this.clienteSeleccionado) {
        if (this.model.latitud !== null && this.model.longitud !== null) {
          this.setMarkerAndCenter({ lat: this.model.latitud, lng: this.model.longitud });
        } else if (this.clienteSeleccionado.ubicacion) {
          this.trySearchClientAddressWithPlaces(this.clienteSeleccionado.ubicacion);
        }
      }
    } else {
      this.map.setCenter(this.marker?.getPosition() || center);
    }

    setTimeout(() => {
      google.maps.event.trigger(this.map, 'resize');
      this.map.setCenter(this.marker?.getPosition() || center);
    }, 100);
  }

  private initAutocomplete(force = false): void {
    const input = this.searchInputRef?.nativeElement;
    if (!input || !(window as any)?.google?.maps?.places) return;
    if (this.autocompleteInited && !force) return;

    this.autocomplete = null;
    this.autocompleteInited = false;

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

      this.model.latitud = lat;
      this.model.longitud = lng;
      this.model.direccionGoogleMaps = place.formatted_address || place.name || `${lat}, ${lng}`;
      this.model.googlePlaceId = place.place_id || '';
      this.busquedaMapa = place.formatted_address || place.name || '';

      this.setMarkerAndCenter({ lat, lng });
    });

    this.autocompleteInited = true;
  }

  private setMarkerAndCenter(pos: { lat: number; lng: number }): void {
    if (!this.map) return;
    if (!this.marker && (window as any)?.google?.maps) {
      this.marker = new google.maps.Marker({
        position: pos, map: this.map,
        draggable: true, title: 'Ubicación de la orden'
      });
      this.marker.addListener('dragend', (e: any) => this.updateLocationFromLatLng(e.latLng.lat(), e.latLng.lng()));
    } else if (this.marker) {
      this.marker.setPosition(pos);
    }
    this.map.setCenter(pos);
    try { this.map.setZoom(16); } catch {}
  }

  private updateLocationFromLatLng(lat: number, lng: number): void {
    this.model.latitud = lat;
    this.model.longitud = lng;
    this.setMarkerAndCenter({ lat, lng });

    if (!this.geocoder && (window as any)?.google?.maps) this.geocoder = new google.maps.Geocoder();
    if (!this.geocoder) return;

    this.geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results?.length) {
        const best = results[0];
        this.model.direccionGoogleMaps = best.formatted_address || this.model.direccionGoogleMaps;
        this.model.googlePlaceId = best.place_id || '';
        this.busquedaMapa = best.formatted_address || '';
      } else {
        this.model.direccionGoogleMaps = `${lat}, ${lng}`;
        this.busquedaMapa = `${lat}, ${lng}`;
      }
    });
  }

  centrarEnDurango(): void {
    this.model.latitud = this.DURANGO_CENTER.lat;
    this.model.longitud = this.DURANGO_CENTER.lng;
    this.model.direccionGoogleMaps = 'Durango, Dgo., México';
    this.model.googlePlaceId = '';
    this.busquedaMapa = '';
    this.setMarkerAndCenter(this.DURANGO_CENTER);
    if (this.map) this.map.setZoom(13);
  }

  resetForm(): void {
    this.metodoAccesoVirtual = 'credenciales';
    this.destinatarioTieneCorreo = false;
    this.destinatarioTieneTelefonos = false;
    this.destinatarioCorreo = '';
    this.destinatarioTelefonoFijo = '';
    this.destinatarioWhatsapp = '';
    this.mostrarDropdownAuxiliares = false;
    this.auxiliaresSeleccionados = [];
    this.busquedaMapa = '';
    this.autocomplete = null;
    this.autocompleteInited = false;
    this.map = null;
    this.marker = null;

    this.clienteSeleccionado = null;
    this.busquedaCliente = '';
    this.clientesResultados = [];
    this.loadingClientes = false;

    this.showAddressConfirm = false;
    this.addressConfirmTitle = '';
    this.addressConfirmText = '';
    this.pendingAddressFromClient = '';
    this.mostrarBuscadorDireccion = false;

    this.agregarEventoCalendario = false;
    this.tipoEventoCalendario = 'bloque';
    this.calendarioDia = '';
    this.calendarioInicio = '';
    this.calendarioFin = '';
    this.teamViewerId = '';
    this.teamViewerPassword = '';

    this.model = {
      esVirtual: true, agentePrincipal: 0,
      tituloEvento: '', fechaStart: '', fechaEnd: '',
      nombreSolicitante: '', nombreDestinatario: '',
      contactoSolicitante: '', contactoDestinatario: '',
      urlImagen: '', credencialesEscritas: '',
      direccionGoogleMaps: '', googlePlaceId: '',
      latitud: null, longitud: null, observaciones: ''
    };
  }

  cerrarPanel(): void {
    this.visible.set(false);
    setTimeout(() => { this.cerrar.emit(); this.modalCerrado.emit(); }, 250);
  }

  private toIso(value: string): string | null {
    if (!value?.trim()) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private validateForm(): string[] {
    const errors: string[] = [];
    if (!this.clienteSeleccionado) errors.push('Selecciona un cliente para la orden.');
    if (!this.model.agentePrincipal || this.model.agentePrincipal <= 0) errors.push('Agente principal es obligatorio.');

    if (!this.model.esVirtual) {
      if (this.destinatarioTieneCorreo) {
        if (!this.destinatarioCorreo.trim()) errors.push('Captura correo del destinatario.');
        else if (!this.isValidEmail(this.destinatarioCorreo.trim())) errors.push('Correo inválido.');
      }
      if (this.destinatarioTieneTelefonos && !this.destinatarioTelefonoFijo.trim() && !this.destinatarioWhatsapp.trim()) {
        errors.push('Captura teléfono fijo o WhatsApp.');
      }
      if (this.model.latitud === null || this.model.longitud === null) errors.push('Selecciona una ubicación en el mapa.');
    }

    if (this.agregarEventoCalendario) {
      if (!this.model.tituloEvento?.trim()) errors.push('Título del evento para calendario es obligatorio.');
      if (this.tipoEventoCalendario === 'bloque') {
        if (!this.calendarioInicio.trim()) errors.push('Fecha/hora inicio del evento calendario requerida.');
        if (!this.calendarioFin.trim()) errors.push('Fecha/hora fin del evento calendario requerida.');
      } else {
        if (!this.calendarioDia.trim()) errors.push('Día para evento todo el día requerido.');
      }
    }

    return errors;
  }

  private syncContactoDestinatario(): void {
    const partes: string[] = [];
    if (this.destinatarioTieneCorreo && this.destinatarioCorreo.trim()) partes.push(`Correo: ${this.destinatarioCorreo.trim()}`);
    if (this.destinatarioTieneTelefonos) {
      if (this.destinatarioTelefonoFijo.trim()) partes.push(`Fijo: ${this.destinatarioTelefonoFijo.trim()}`);
      if (this.destinatarioWhatsapp.trim()) partes.push(`WhatsApp: ${this.destinatarioWhatsapp.trim()}`);
    }
    this.model.contactoDestinatario = partes.join(' | ');
  }

  private buildPayload(): CreateOSPayload {
    if (!this.model.esVirtual) this.syncContactoDestinatario();

    if (this.model.esVirtual) {
      const id = this.teamViewerId.trim();
      const pwd = this.teamViewerPassword.trim();
      this.model.credencialesEscritas = id || pwd
        ? `TEAMVIWER ID:${id}, PASSWORD:${pwd}`
        : '';
    }

    const calendario: CreateOSPayload['calendario'] | undefined = this.agregarEventoCalendario ? (
      this.tipoEventoCalendario === 'bloque' ? {
        agregar: true, tipo: 'bloque',
        inicio: this.toIso(this.calendarioInicio) || new Date().toISOString(),
        fin: this.toIso(this.calendarioFin) || new Date().toISOString(),
        dia: null
      } : {
        agregar: true, tipo: 'todoDia',
        inicio: null, fin: null, dia: this.calendarioDia || null
      }
    ) : undefined;

    return {
      documentoId: Math.floor(Date.now() / 1000),
      esVirtual: !!this.model.esVirtual,
      agentePrincipal: Number(this.model.agentePrincipal),
      agenteAuxiliar: this.auxiliaresSeleccionados.length ? this.auxiliaresSeleccionados.join(',') : null,
      tituloEvento: this.model.tituloEvento.trim(),
      fechaStart: this.toIso(this.model.fechaStart) || new Date().toISOString(),
      fechaEnd: this.toIso(this.model.fechaEnd) || new Date().toISOString(),
      nombreSolicitante: this.model.nombreSolicitante.trim(),
      nombreDestinatario: this.model.nombreDestinatario.trim(),
      contactoSolicitante: this.model.contactoSolicitante.trim(),
      contactoDestinatario: this.model.contactoDestinatario.trim(),
      urlImagen: this.model.urlImagen.trim(),
      credencialesEscritas: this.model.credencialesEscritas.trim(),
      estadoFactura: 'PENDIENTE',
      direccionGoogleMaps: this.model.direccionGoogleMaps.trim(),
      googlePlaceId: this.model.googlePlaceId.trim(),
      latitud: this.model.latitud,
      longitud: this.model.longitud,
      observaciones: this.model.observaciones.trim(),
      calendario,
      clienteId: this.clienteSeleccionado?.idCliente ?? null
    };
  }

  private normalizarTelefonoMx(raw?: string | null): string | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) return `52${digits}`;
    if (digits.length === 12 && digits.startsWith('52')) return digits;
    return digits;
  }

  private abrirWhatsAppNotificacion(response: any): void {
    const principalId = Number(this.model.agentePrincipal);
    const agente = this.agentes.find(a => a.id === principalId);
    const telefonoAgente = this.normalizarTelefonoMx(agente?.telefono);

    const folio = response?.id ?? response?.ordenId ?? response?.data?.id ?? '';
    const clienteNombre = this.clienteSeleccionado?.razonSocial || 'N/A';
    const observacion = (this.model.observaciones || '').trim() || 'N/A';

    const msg = `Soporte No: ${folio} Para el Cliente: ${clienteNombre} Problema: ${observacion}`;
    const encoded = encodeURIComponent(msg);

    if (telefonoAgente) window.open(`https://wa.me/${telefonoAgente}?text=${encoded}`, '_blank');
    else window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
  }

  registrarOrden(): void {
    const errors = this.validateForm();
    if (errors.length) { alert(`❌ Corrige:\n\n- ${errors.join('\n- ')}`); return; }

    const payload = this.buildPayload();

    this.pendingPayload = payload;
    this.pendingTeamViewerId = (payload as any).teamViewerId ?? '';
    this.pendingTeamViewerPassword = (payload as any).teamViewerPassword ?? '';

    const agentePrincipalNombre = this.agentes.find(a => a.id === Number(this.model.agentePrincipal))?.nombre || String(this.model.agentePrincipal);
    this.confirmTitulo = `¿Estás seguro de asignar esta orden de servicio para el agente principal ${agentePrincipalNombre}?`;
    this.confirmParrafo = `Se creará una orden de servicio despues de aceptar`;
    this.showConfirm = true;
  }

  onConfirmDialogAccept(ev: Event): void {
    this.showConfirm = false;
    if (!this.pendingPayload) return;

    const payload = this.pendingPayload;
    this.pendingPayload = null;
    this.pendingTeamViewerId = '';
    this.pendingTeamViewerPassword = '';

    this.cargando.set(true);

    this.ordenesService.crearOrdenServicio(payload).subscribe({
      next: (response: any) => {
        this.cargando.set(false);
        this.ordenCreada.emit(response);
        this.abrirWhatsAppNotificacion(response);

        if (this.agregarEventoCalendario) {
          const summary = this.model.tituloEvento?.trim() ? this.model.tituloEvento.trim() : `Orden ${response?.documentoId || response?.id || ''}`;
          const description = `Orden: ${response?.documentoId || response?.id || ''}\nCliente: ${this.clienteSeleccionado?.razonSocial || ''}\nObservaciones: ${this.model.observaciones || ''}`;
          const location = this.model.direccionGoogleMaps || '';

          if (this.tipoEventoCalendario === 'bloque') {
            const startIso = this.toIso(this.calendarioInicio) ?? new Date().toISOString();
            const endIso = this.toIso(this.calendarioFin) ?? new Date().toISOString();
            this.ordenesService.createGoogleCalendarEvent({
              summary, description, location,
              tipo: 'bloque', startIso, endIso
            }).subscribe({
              next: (evtResp: any) => console.log('Evento calendario creado (backend):', evtResp),
              error: (err: any) => console.error('Error creando evento en Calendar vía backend:', err)
            });
          } else {
            const dia = this.calendarioDia || new Date().toISOString().slice(0, 10);
            this.ordenesService.createGoogleCalendarEvent({
              summary, description, location,
              tipo: 'todoDia', dia
            }).subscribe({
              next: (evtResp: any) => console.log('Evento calendario creado (backend):', evtResp),
              error: (err: any) => console.error('Error creando evento en Calendar vía backend:', err)
            });
          }
        }

        this.cerrarPanel();
      },
      error: (error: any) => {
        this.cargando.set(false);
        const ve = error?.error?.errors;
        if (ve) {
          const lines: string[] = [];
          Object.keys(ve).forEach(k => { if (Array.isArray(ve[k])) ve[k].forEach((m: string) => lines.push(`${k}: ${m}`)); });
          alert(`❌ Validación backend:\n\n- ${lines.join('\n- ')}`);
          return;
        }
        alert(`❌ Error: ${error?.error?.message || error?.message || 'Error desconocido'}`);
      }
    });
  }

  onConfirmDialogCancel(ev: Event): void {
    this.showConfirm = false;
    this.pendingPayload = null;
    this.pendingTeamViewerId = '';
    this.pendingTeamViewerPassword = '';
  }

  onConfirmDialogValueChange(val: string): void {
    console.log('Dialog valueChange:', val);
  }
}