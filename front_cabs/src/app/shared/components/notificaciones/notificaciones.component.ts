// ============================================================
// COMPONENTE DE NOTIFICACIONES - notificaciones.component.ts
// ============================================================
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { UiIconComponent } from '../../atoms/icono/icono.component';
import { UitipografiaComponent, UiBotonComponent } from "../../~exports/detail-view.index";

// Define los tipos de tabs
type TabActivo = 'todos' | 'tab2' | 'tab3';

// Interfaz para los tabs
interface TabNotificacion {
  id: TabActivo;
  label: string;
  disponible: boolean;
}

// Interfaz de notificación
interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  fechaCreacion: Date;
  leida: boolean;
  prioridad: string;
  accion?: string;
}

type SeccionNotificacion = 'hoy' | 'ayer' | 'semanaPasada' | 'mesPasado' | 'anioPasado' | 'anteriores';

interface NotificacionesAgrupadas {
  hoy: Notificacion[];
  ayer: Notificacion[];
  semanaPasada: Notificacion[];
  mesPasado: Notificacion[];
  anioPasado: Notificacion[];
  anteriores: Notificacion[];
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective, UiIconComponent, UitipografiaComponent, UiBotonComponent],
  templateUrl: './notificaciones.component.html'
})
export class NotificacionesComponent implements OnInit, AfterViewInit {
  @ViewChild('contenedorNotificaciones') contenedorNotificaciones!: ElementRef;
  
  notificaciones: Notificacion[] = [];
  notificacionesAgrupadas: NotificacionesAgrupadas = {
    hoy: [],
    ayer: [],
    semanaPasada: [],
    mesPasado: [],
    anioPasado: [],
    anteriores: []
  };
  
  // Estados 
  mostrarEsqueleto = signal<boolean>(false);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  sinDatos = signal<boolean>(true);
  
  
  // Estado Bandeja
  mostrarDropdown = false;


  notificacionesNoLeidas = 0;  
  
  // Tabs
  tabActivo: TabActivo = 'todos';
  tabs: TabNotificacion[] = [
    { id: 'todos', label: 'Todos', disponible: true },
  ];
  
  // Control de secciones visibles
  seccionesVisibles: Record<SeccionNotificacion, boolean> = {
    hoy: true,
    ayer: true,
    semanaPasada: true,
    mesPasado: true,
    anioPasado: true,
    anteriores: true
  };
  
  // Sección sticky activa (para el header fijo)
  seccionStickyActiva: SeccionNotificacion | null = null;
  private seccionElements = new Map<SeccionNotificacion, HTMLElement>();

  constructor() {}

  ngOnInit() {
    this.cargarDatosMock();
  }

  ngAfterViewInit() {
    setTimeout(() => this.inicializarObservadorInterseccion(), 100);
  }

  // ============================================================
  // DATOS MOCK - Solo para pruebas de estilos
  // ============================================================
  private cargarDatosMock() {
    this.mostrarEsqueleto.set(true);
    
    // Simular carga
    setTimeout(() => {
      this.notificaciones = [
        {
          id: 1,
          titulo: 'Bienvenida',
          mensaje: 'Bienvenido a la plataforma',
          fechaCreacion: new Date(),
          leida: false,
          prioridad: 'alta',
          accion: '/dashboard'
        },
        {
          id: 2,
          titulo: 'Actualización',
          mensaje: 'Nueva versión disponible',
          fechaCreacion: new Date(Date.now() - 3600000),
          leida: false,
          prioridad: 'media',
          accion: '/updates'
        },
        {
          id: 3,
          titulo: 'Recordatorio',
          mensaje: 'Tienes una tarea pendiente',
          fechaCreacion: new Date(Date.now() - 86400000),
          leida: true,
          prioridad: 'normal',
          accion: '/tasks'
        },
        {
          id: 4,
          titulo: 'Oferta especial',
          mensaje: 'Descuento del 20%',
          fechaCreacion: new Date(Date.now() - 172800000),
          leida: false,
          prioridad: 'baja',
          accion: '/promotions'
        },
        {
          id: 5,
          titulo: 'Seguridad',
          mensaje: 'Inicio de sesión desde nuevo dispositivo',
          fechaCreacion: new Date(Date.now() - 604800000),
          leida: true,
          prioridad: 'alta',
          accion: '/security'
        },
        {
          id: 6,
          titulo: 'Mantenimiento',
          mensaje: 'Mantenimiento programado',
          fechaCreacion: new Date(Date.now() - 2592000000),
          leida: false,
          prioridad: 'media',
          accion: '/maintenance'
        },
        {
          id: 7,
          titulo: 'Reporte mensual',
          mensaje: 'Tu reporte ya está listo',
          fechaCreacion: new Date(Date.now() - 7776000000),
          leida: false,
          prioridad: 'normal',
          accion: '/reports'
        }
      ];
      
      this.agruparNotificacionesPorTiempo();
      this.actualizarContador();
      this.mostrarEsqueleto.set(false);
      
      setTimeout(() => this.inicializarObservadorInterseccion(), 50);
    }, 500); // Simular delay de carga
  }

  private agruparNotificacionesPorTiempo() {
    this.notificacionesAgrupadas = {
      hoy: [],
      ayer: [],
      semanaPasada: [],
      mesPasado: [],
      anioPasado: [],
      anteriores: []
    };

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioAyer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);
    const inicioSemanaPasada = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const inicioAnioPasado = new Date(ahora.getFullYear() - 1, 0, 1);

    this.notificaciones.forEach(notif => {
      const fechaNotif = new Date(notif.fechaCreacion);
      
      if (fechaNotif >= inicioHoy) {
        this.notificacionesAgrupadas.hoy.push(notif);
      } else if (fechaNotif >= inicioAyer) {
        this.notificacionesAgrupadas.ayer.push(notif);
      } else if (fechaNotif >= inicioSemanaPasada) {
        this.notificacionesAgrupadas.semanaPasada.push(notif);
      } else if (fechaNotif >= inicioMesPasado) {
        this.notificacionesAgrupadas.mesPasado.push(notif);
      } else if (fechaNotif >= inicioAnioPasado) {
        this.notificacionesAgrupadas.anioPasado.push(notif);
      } else {
        this.notificacionesAgrupadas.anteriores.push(notif);
      }
    });

    this.seccionesVisibles.hoy = this.notificacionesAgrupadas.hoy.length > 0;
    this.seccionesVisibles.ayer = this.notificacionesAgrupadas.ayer.length > 0;
    this.seccionesVisibles.semanaPasada = this.notificacionesAgrupadas.semanaPasada.length > 0;
    this.seccionesVisibles.mesPasado = this.notificacionesAgrupadas.mesPasado.length > 0;
    this.seccionesVisibles.anioPasado = this.notificacionesAgrupadas.anioPasado.length > 0;
    this.seccionesVisibles.anteriores = this.notificacionesAgrupadas.anteriores.length > 0;
  }

  private actualizarContador() {
    this.notificacionesNoLeidas = this.notificaciones.filter(n => !n.leida).length;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS (UI)
  // ============================================================
  
  cambiarTab(tabId: TabActivo) {
    if (this.tabs.find(t => t.id === tabId)?.disponible) {
      this.tabActivo = tabId;
    }
  }

  toggleDropdown() {
    this.mostrarDropdown = !this.mostrarDropdown;
  }

  marcarComoLeida(notificacion: Notificacion) {
    if (notificacion.leida) return;
    notificacion.leida = true;
    this.actualizarContador();
    this.agruparNotificacionesPorTiempo();
  }

  ejecutarAccion(notificacion: Notificacion) {
    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion);
    }
    console.log('📍 Acción ejecutada:', notificacion.accion);
  }
  
  verTodasNotificaciones() {
    console.log('📋 Ver todas');
  }

  recargar() {
    this.cargarDatosMock();
  }

  getTituloSticky(): string {
    if (!this.seccionStickyActiva) return '';
    return this.getTituloSeccion(this.seccionStickyActiva);
  }

  getTituloSeccion(seccion: SeccionNotificacion): string {
    const titulos: Record<SeccionNotificacion, string> = {
      hoy: 'Hoy',
      ayer: 'Ayer',
      semanaPasada: 'Esta semana',
      mesPasado: 'Este mes',
      anioPasado: 'Este año',
      anteriores: 'Anteriores'
    };
    return titulos[seccion];
  }

  formatearPrioridad(prioridad: string): string {
    if (!prioridad) return '';
    return prioridad.charAt(0).toUpperCase() + prioridad.slice(1);
  }

  getPrioridadClass(prioridad: string): string {
    const clases: Record<string, string> = {
      alta: 'bg-red-100 text-red-800',
      media: 'bg-yellow-100 text-yellow-800',
      normal: 'bg-gray-100 text-gray-800',
      baja: 'bg-green-100 text-green-800'
    };
    return clases[prioridad?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  getFechaRelativa(fechaStr: Date): string {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  getSeccionesConDatos(): SeccionNotificacion[] {
    return Object.keys(this.seccionesVisibles).filter(
      key => this.seccionesVisibles[key as SeccionNotificacion]
    ) as SeccionNotificacion[];
  }

  getNotificacionesPorSeccion(seccion: SeccionNotificacion): Notificacion[] {
    return this.notificacionesAgrupadas[seccion] || [];
  }

  getContadorSeccion(seccion: SeccionNotificacion): number {
    return this.getNotificacionesPorSeccion(seccion).length;
  }

  private inicializarObservadorInterseccion() {
    if (!this.contenedorNotificaciones?.nativeElement) return;

    const opciones = {
      root: this.contenedorNotificaciones.nativeElement,
      rootMargin: '-60px 0px 0px 0px',
      threshold: [0, 0.1, 0.5, 1]
    };

    const observador = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const seccionId = entry.target.getAttribute('data-seccion') as SeccionNotificacion;
        if (seccionId && entry.isIntersecting) {
          this.seccionStickyActiva = seccionId;
        }
      });
    }, opciones);

    this.getSeccionesConDatos().forEach(seccion => {
      const elemento = document.querySelector(`[data-seccion="${seccion}"]`);
      if (elemento) {
        observador.observe(elemento);
        this.seccionElements.set(seccion, elemento as HTMLElement);
      }
    });
  }
}