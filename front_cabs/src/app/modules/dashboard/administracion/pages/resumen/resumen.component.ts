import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';
import { UiCardComponent } from '../../../../../shared/molecules/card/card.component';
import { UiBarraGraficaComponent } from '../../../../../shared/molecules/barrGrafica/bar-grafica.component';
import type { VarianteEtiqueta } from '../../../../../shared/molecules/etiqueta/etiqueta.component';
import { ReportesCotizacionesService } from '../../../../../core/services/reportes-cotizaciones.service';
import { UitipografiaComponent } from '../../../../../shared/~exports/detail-view.index';
import { SecureAuthService, User } from '../../../../../core/services/secure-auth.service';
import { single } from 'rxjs';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
// Interfaz para datos mensuales
interface DatoMensual {
  mes: string;
  valor: number;
}

// Interfaz para tarjetas
interface TarjetaConfig {
  id: number;
  nameIcono: string;
  titulo: string;
  viewSimbolo: boolean;
  porcentaje: string;
  estadoEtiqueta: VarianteEtiqueta;
  valor: number | number[];
  datos: DatoMensual[];
  viewDescripcion: boolean;
  descripcion?: string; 
  viewLabel: boolean;
}

// Nombres de meses en español
const MESES_NOMBRES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

@Component({
  imports: [
    CommonModule,
    UiHeaderComponent,
    UiCardComponent,
    UiBarraGraficaComponent,
    UitipografiaComponent,
    UiIconComponent
  ],
  templateUrl: './resumen.component.html',
})
export class ResumenComponent {
  private reportesService = inject(ReportesCotizacionesService);
  private authService = inject(SecureAuthService);


  // Señales de estado 
  mostrarEsqueleto = signal<boolean>(false);
  monstrarDatos = signal<boolean>(false);
  errorDeConexion = signal<boolean>(false);
  sinDatos = signal<boolean>(false);

  currentYear = new Date().getFullYear();
  currentUser: User | null = null; // Propiedad para almacenar el usuario actual
  userName: string = ''; // Propiedad para el nombre del usuario

  // Datos dinámicos que se cargarán de la API
  ventasCotizadas: DatoMensual[] = [];
  ventasCanceladas: DatoMensual[] = [];

  // Tarjetas configurables
  tarjetas: TarjetaConfig[] = [];
  tarjetaGrafica: TarjetaConfig[] = [];
  tarjetaSeleccionadaId = 1;

  // Estadísticas para el panel de resumen
  totalCotizacionesActivas = 0;
  totalCotizacionesCanceladas = 0;
  montoTotalAnual = 0;
  promedioMensual = 0;


  ngOnInit() {
    this.cargarUsuario(); // Cargar usuario primero
    this.cargarDatosAnuales();
    
  }
  /**
   * Carga los datos del usuario actual desde la API
   */
  private cargarUsuario() {
    this.authService.getMe().subscribe({
      next: (user: User) => {
        this.currentUser = user;
        this.userName = user.nombre 
        console.log('Usuario cargado:', this.userName);
      },
      error: (err) => {
        console.error('Error al cargar usuario:', err);
        // Si falla, intentar obtener del estado local
        const localUser = this.authService.getCurrentUser();
        if (localUser) {
          this.currentUser = localUser;
        }
      }
    });
  }

  /**
   * Obtiene el nombre del usuario en formato legible
   */


  /**
   * Carga datos de cotizaciones para todo el año con desglose mensual real desde API
   */
  private cargarDatosAnuales() {
    const year = this.currentYear;
    
    // Activar esqueleto al iniciar la carga
    this.mostrarEsqueleto.set(true);
    this.monstrarDatos.set(false);
    this.errorDeConexion.set(false);
    this.sinDatos.set(false);
    
    this.reportesService.getEstadisticasMensuales(year).subscribe({
      next: (response) => {
        if (response.data) {
          const data = response.data;

          // Mapear datos para gráficas
          this.ventasCotizadas = data.map(d => ({
            mes: d.nombreMes.substring(0, 3),
            valor: d.cotizacionesActivas
          }));

          this.ventasCanceladas = data.map(d => ({
            mes: d.nombreMes.substring(0, 3),
            valor: d.cotizacionesCanceladas
          }));

          // Calcular totales
          this.totalCotizacionesActivas = data.reduce((sum, item) => sum + item.cotizacionesActivas, 0);
          this.totalCotizacionesCanceladas = data.reduce((sum, item) => sum + item.cotizacionesCanceladas, 0);
          this.montoTotalAnual = data.reduce((sum, item) => sum + item.montoTotal, 0);

          const totalCotizaciones = this.totalCotizacionesActivas + this.totalCotizacionesCanceladas;
          this.promedioMensual = totalCotizaciones > 0 ? this.montoTotalAnual / totalCotizaciones : 0;

          // Actualizar estados
          this.monstrarDatos.set(true);
          this.sinDatos.set(false);
          this.errorDeConexion.set(false);

        } if( this.totalCotizacionesActivas == 0 && this.totalCotizacionesCanceladas == 0 && this.montoTotalAnual ==0 && this.promedioMensual==0){
          this.inicializarDatosVacios();
          this.sinDatos.set(true);
          this.monstrarDatos.set(false);
        }
        
        // Configurar tarjetas después de tener los datos
        this.configurarTarjetas();
        this.mostrarEsqueleto.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos mensuales:', err);
        this.inicializarDatosVacios();
        
        // Actualizar estados en caso de error
        this.mostrarEsqueleto.set(false);
        this.monstrarDatos.set(false);
        this.sinDatos.set(false);
        this.errorDeConexion.set(true);
      }
    });
  }

  /**
   * Inicializa datos vacíos cuando hay error en la API
   */
  private inicializarDatosVacios() {
    this.ventasCotizadas = MESES_NOMBRES.map(mes => ({ mes, valor: 0 }));
    this.ventasCanceladas = MESES_NOMBRES.map(mes => ({ mes, valor: 0 }));
    this.totalCotizacionesActivas = 0;
    this.totalCotizacionesCanceladas = 0;
    this.montoTotalAnual = 0;
    this.promedioMensual = 0;
    this.configurarTarjetas();
  }

  /**
   * Configura las tarjetas con los datos cargados
   */
  private configurarTarjetas() {
    this.tarjetas = [
      {
        id: 1,
        nameIcono: 'document-check',
        titulo: 'Cotizaciones activas',
        viewSimbolo: false,
        porcentaje: '',
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        valor: this.totalCotizacionesActivas,
        datos: this.ventasCotizadas,
        viewDescripcion: false,
        viewLabel: true,
      },
      {
        id: 2,
        nameIcono: 'x-circle',
        titulo: 'Cotizaciones canceladas',
        viewSimbolo: false,
        porcentaje: '',
        estadoEtiqueta: 'negativo' as VarianteEtiqueta,
        valor: this.totalCotizacionesCanceladas,
        datos: this.ventasCanceladas,
        viewDescripcion: false,
        viewLabel: true,
      }
    ];

    this.tarjetaGrafica = [
      {
        id: 1,
        nameIcono: 'document-check',
        titulo: 'Tasa de éxito anual de cotizaciones',
        viewSimbolo: false,
        porcentaje: '',
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        valor: this.tasaExito,
        datos: this.ventasCotizadas,
        viewDescripcion: true,
        descripcion: 'Pronóstico anual de cierre, según rendimiento y tendencias actuales.',
        viewLabel: false,
      },
      {
        id: 2,
        nameIcono: 'currency-dollar',
        titulo: 'Ingresos totales del año',
        viewSimbolo: true,
        porcentaje: '',
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        valor: this.montoTotalAnual,
        datos: this.ventasCotizadas,
        viewDescripcion: true,
        descripcion: 'Representa la suma consolidada de todos los ingresos generados durante este año 2026.',
        viewLabel: false,
      }, 
      {
        id: 3,
        nameIcono: 'divide',
        titulo: 'Promedio del año',
        viewSimbolo: true,
        porcentaje: '',
        estadoEtiqueta: 'positivo' as VarianteEtiqueta,
        valor: this.promedioMensual,
        datos: this.ventasCotizadas,
        viewDescripcion: true,
        descripcion: 'Representa el promedio de las cotizaciones generadas',
        viewLabel: false,
      },                   
    ];

    // Calcular porcentajes para cada tarjeta
    this.tarjetas.forEach(tarjeta => this.calcularPorcentajeTarjeta(tarjeta));
  }

  /**
   * Calcula el porcentaje de cambio para una tarjeta
   */
  private calcularPorcentajeTarjeta(tarjeta: TarjetaConfig) {
    const datos = tarjeta.datos;
    if (datos.length < 2) return;

    const mesActual = new Date().getMonth();
    const actual = datos[mesActual]?.valor ?? 0;
    const anterior = mesActual > 0 ? datos[mesActual - 1]?.valor : datos[11]?.valor ?? 0;

    if (anterior > 0) {
      const cambio = ((actual - anterior) / anterior) * 100;
      tarjeta.porcentaje = `${cambio >= 0 ? '' : '-'}${Math.abs(cambio).toFixed(0)}%`;
    } else if (actual > 0) {
      tarjeta.porcentaje = '100%';
    } else {
      tarjeta.porcentaje = '0%';
    }
  }

  /**
   * Selecciona una tarjeta (solo de this.tarjetas, no de tarjetaGrafica)
   */
  seleccionarTarjeta(id: number) {
    const tarjetaExiste = this.tarjetas.some(t => t.id === id);
    
    if (tarjetaExiste) {
      this.tarjetaSeleccionadaId = id;
    }
  }

  /**
   * Método vacío para tarjetas que no deben ser seleccionables
   */
  noSeleccionar() {
    // No hacer nada - tarjetas de tarjetaGrafica no son seleccionables
  }

  /**
   * Obtiene los datos de la tarjeta seleccionada
   */
  get datosSeleccionados(): DatoMensual[] {
    return this.tarjetas.find(t => t.id === this.tarjetaSeleccionadaId)?.datos || [];
  }

  /**
   * Obtiene el título de la tarjeta seleccionada
   */
  get tituloSeleccionado(): string {
    return this.tarjetas.find(t => t.id === this.tarjetaSeleccionadaId)?.titulo ?? '';
  }

  /**
   * Actualiza el valor de la tarjeta al hacer click en una barra
   */
  actualizarValorTarjeta(indice: number) {
    const tarjeta = this.tarjetas.find(t => t.id === this.tarjetaSeleccionadaId);
    if (!tarjeta) return;

    const datos = tarjeta.datos;
    tarjeta.valor = datos[indice]?.valor ?? tarjeta.valor;
  }

  /**
   * Calcula la tasa de éxito (cotizaciones activas / total)
   */
  get tasaExito(): number {
    const total = this.totalCotizacionesActivas + this.totalCotizacionesCanceladas;
    return total > 0 ? (this.totalCotizacionesActivas / total) * 100 : 0;
  }

  /**
   * Obtiene el nombre del usuario para mostrar
   */
  get nombreUsuario(): string {
    return this.userName || 'Usuario';
  }

  /**
   * Verifica si el usuario está autenticado
   */
  get usuarioAutenticado(): boolean {
    return !!this.currentUser;
  }
}