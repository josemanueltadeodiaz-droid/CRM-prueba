# Guía de Implementación - Componentes de Órdenes de Servicio

**Objetivo:** Documento para mejorar los componentes individuales (Reparaciones, Capacitaciones, Servicios Técnicos) con APIs adecuadas y mejor UX

**Fecha:** Enero 13, 2026

---

## 📋 Tabla de Contenidos

1. [Estructura General de Componentes](#estructura-general-de-componentes)
2. [Patrón de Consumo de APIs](#patrón-de-consumo-de-apis)
3. [Componente Reparaciones](#componente-reparaciones)
4. [Componente Capacitaciones](#componente-capacitaciones)
5. [Componente Servicios Técnicos](#componente-servicios-técnicos)
6. [Componentes de Diálogo](#componentes-de-diálogo)
7. [Manejo de Errores](#manejo-de-errores)
8. [Validación de Formularios](#validación-de-formularios)
9. [Testing](#testing)

---

## 🏗️ Estructura General de Componentes

### Patrón Recomendado

```typescript
import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-[modulo]',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogComponent,
    TablaListadoComponent,
    PaginacionComponent,
    UiHeaderTabsComponent
  ],
  templateUrl: './[modulo].component.html',
  styleUrl: './[modulo].component.css'
})
export class [ModuloComponent] implements OnInit, OnDestroy {
  // 1. Inyecciones
  private service = inject([ModuloService]);
  private notifyService = inject(NotificationService);
  private logger = inject(LoggerService);
  private destroy$ = new Subject<void>();

  // 2. Signals para estado reactivo
  items = signal<[Item][]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  totalElementos = signal<number>(0);
  paginaActual = signal<number>(1);
  selectedId = signal<number | null>(null);

  // 3. Template References
  @ViewChild('[tipo]Template') [tipo]Template!: TemplateRef<any>;

  // 4. Configuración
  configuracionPaginacion: ConfiguracionPaginacion = { /* ... */ };

  // 5. Lifecycle
  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 6. Métodos públicos
  cargarDatos() { /* ... */ }
  crear() { /* ... */ }
  actualizar(id: number) { /* ... */ }
  eliminar(id: number) { /* ... */ }

  // 7. Métodos privados
  private procesarRespuesta(data: any) { /* ... */ }
  private manejarError(error: any) { /* ... */ }
}
```

---

## 🔌 Patrón de Consumo de APIs

### 1. Carga Inicial de Datos

```typescript
private cargarDatos(skip: number = 0, take: number = 10): void {
  this.loading.set(true);
  this.error.set(null);

  this.ordenService
    .obtenerReparaciones(skip, take)
    .pipe(
      takeUntil(this.destroy$),
      // Opcional: loading state con delay
      timeout(5000) // Timeout de 5 segundos
    )
    .subscribe({
      next: (response) => this.procesarRespuesta(response),
      error: (error) => this.manejarError(error),
      complete: () => this.loading.set(false)
    });
}

private procesarRespuesta(response: ApiResponse<Reparacion[]>): void {
  this.reparaciones.set(response.reparaciones);
  this.totalElementos.set(response.total);
  this.logger.info('Datos cargados exitosamente', response);
}

private manejarError(error: any): void {
  const mensajeError = error.error?.message || 'Error al cargar datos';
  this.error.set(mensajeError);
  this.notifyService.error(mensajeError);
  this.logger.error('Error en API', error);
  this.loading.set(false);
}
```

### 2. Búsqueda y Filtrado

```typescript
// En el component
private searchSubject = new Subject<string>();

ngOnInit() {
  this.cargarDatos();
  
  // Búsqueda con debounce
  this.searchSubject
    .pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    )
    .subscribe((termino) => {
      this.buscar(termino);
    });
}

onBuscar(termino: string): void {
  this.searchSubject.next(termino);
}

private buscar(termino: string): void {
  // Llamar API con filtro
  this.ordenService
    .filtrarReparaciones({ busqueda: termino })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => this.procesarRespuesta(response),
      error: (error) => this.manejarError(error)
    });
}
```

### 3. Crear Nuevo Registro

```typescript
onCrear(): void {
  // Abrir dialog
  this.dialog.open(DialogReparacionesComponent, {
    data: { modo: 'crear' }
  }).afterClosed()
    .pipe(
      filter((resultado) => resultado !== undefined),
      takeUntil(this.destroy$)
    )
    .subscribe((nuevoRegistro) => {
      this.crearRegistro(nuevoRegistro);
    });
}

private crearRegistro(request: CreateReparacionRequest): void {
  this.loading.set(true);
  
  this.ordenService
    .crearReparacion(request)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultado) => {
        this.notifyService.success('Reparación creada exitosamente');
        this.cargarDatos(0, 10); // Recargar listado
      },
      error: (error) => this.manejarError(error),
      complete: () => this.loading.set(false)
    });
}
```

### 4. Actualizar Registro

```typescript
onActualizar(id: number): void {
  // Obtener registro actual
  this.ordenService
    .obtenerReparacionPorId(id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (registro) => {
        this.abrirDialogoEditar(registro);
      },
      error: (error) => this.manejarError(error)
    });
}

private abrirDialogoEditar(registro: ReparacionResponse): void {
  this.dialog.open(DialogReparacionesComponent, {
    data: { modo: 'editar', registro }
  }).afterClosed()
    .pipe(takeUntil(this.destroy$))
    .subscribe((actualizado) => {
      if (actualizado) {
        this.actualizarRegistro(registro.id, actualizado);
      }
    });
}

private actualizarRegistro(id: number, request: CreateReparacionRequest): void {
  this.loading.set(true);
  
  this.ordenService
    .actualizarReparacion(id, request)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notifyService.success('Reparación actualizada exitosamente');
        this.cargarDatos(0, 10);
      },
      error: (error) => this.manejarError(error),
      complete: () => this.loading.set(false)
    });
}
```

### 5. Eliminar Registro

```typescript
onEliminar(id: number): void {
  if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) {
    return;
  }

  this.loading.set(true);
  
  this.ordenService
    .eliminarReparacion(id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.notifyService.success('Reparación eliminada exitosamente');
        this.cargarDatos(0, 10);
      },
      error: (error) => this.manejarError(error),
      complete: () => this.loading.set(false)
    });
}
```

---

## 🔧 Componente Reparaciones

### Funcionalidades Principales

```
LISTADO:
├── Tabla con columnas: ID, Cliente, Estado, Costo, Fecha
├── Búsqueda por cliente o descripción
├── Filtros por:
│   ├── Estado (CREADA, DIAGNOSTICO, etc.)
│   ├── Rango de costo
│   ├── Rango de fechas
│   └── Agente asignado
├── Paginación
└── Acciones (Ver, Editar, Eliminar)

CREAR:
├── Dialog con formulario
├── Campos: Cliente*, Descripción*, Diagnostico, Costos, Garantía
├── Validación en tiempo real
└── Submit POST

EDITAR:
├── Pre-carga de datos actuales
├── Formulario editable
├── Validación de cambios
└── Submit PUT

ESTADO:
├── Transiciones válidas:
│   ├── CREADA → DIAGNOSTICO
│   ├── DIAGNOSTICO → REPUESTOS_PENDIENTES
│   ├── REPUESTOS_PENDIENTES → EN_REPARACION
│   ├── EN_REPARACION → PRUEBAS
│   ├── PRUEBAS → COMPLETADA
│   └── (Cualquier) → CANCELADA
└── Visual indicator del estado actual
```

### TypeScript Mejorado

```typescript
import { Component, OnInit, OnDestroy, signal, inject, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { OrdenServicioService } from '../../../../../core/services/orden-servicio.service';
import { ReparacionResponse, CreateReparacionRequest } from '../../../../../core/models/orden-servicio.interface';

@Component({
  selector: 'app-reparaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reparaciones.component.html',
  styleUrl: './reparaciones.component.css'
})
export class ReparacionesComponent implements OnInit, OnDestroy {
  private ordenService = inject(OrdenServicioService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Signals
  reparaciones = signal<ReparacionResponse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  totalElementos = signal<number>(0);
  paginaActual = signal<number>(1);
  filtroEstado = signal<string>('');
  terminoBusqueda = signal<string>('');

  // Templates
  @ViewChild('estadoTemplate') estadoTemplate!: TemplateRef<any>;
  @ViewChild('costoTemplate') costoTemplate!: TemplateRef<any>;
  @ViewChild('accionesTemplate') accionesTemplate!: TemplateRef<any>;

  ngOnInit() {
    this.cargarDatos();
    this.setupBusqueda();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupBusqueda(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((termino) => {
        this.paginaActual.set(1);
        this.cargarDatos(0);
      });
  }

  cargarDatos(skip: number = 0): void {
    this.loading.set(true);
    this.error.set(null);

    const take = 10;
    this.ordenService
      .obtenerReparaciones(skip, take)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.reparaciones.set(response.reparaciones);
          this.totalElementos.set(response.total);
        },
        error: (error) => {
          this.error.set('Error al cargar reparaciones');
          console.error(error);
        },
        complete: () => this.loading.set(false)
      });
  }

  onBuscar(termino: string): void {
    this.terminoBusqueda.set(termino);
    this.searchSubject.next(termino);
  }

  onCambiarEstado(nuevoEstado: string): void {
    this.filtroEstado.set(nuevoEstado);
    this.paginaActual.set(1);
    this.cargarDatos(0);
  }

  onCrear(): void {
    // Abrir dialog
  }

  onEditar(id: number): void {
    // Abrir dialog con datos existentes
  }

  onEliminar(id: number): void {
    if (!confirm('¿Eliminar esta reparación?')) return;
    // Llamar servicio DELETE
  }

  onPaginaChange(numeroPagina: number): void {
    this.paginaActual.set(numeroPagina);
    const skip = (numeroPagina - 1) * 10;
    this.cargarDatos(skip);
  }
}
```

---

## 📚 Componente Capacitaciones

### Funcionalidades Principales

```
LISTADO:
├── Vista previa: Tema, Modalidad, Estado
├── Filtros por:
│   ├── Modalidad (Virtual/Presencial)
│   ├── Estado (CREADA, PROGRAMADA, EN_CURSO, COMPLETADA, CANCELADA)
│   ├── Asistencia (Confirmada/Pendiente)
│   └── Rango de fechas
├── Indicador de asistencia (porcentaje visual)
└── Botón "Generar Constancia" (solo COMPLETADA)

CREAR:
├── Tema*, Contenido, Duración
├── Tipo: Virtual/Presencial
├── Si Virtual: Plataforma, Link
├── Si Presencial: Ubicación, Capacidad
├── Asistentes esperados
└── Auto-calcular porcentaje

EDITAR:
├── Actualizar información
├── Actualizar asistencias
├── Cambiar estado
└── Regenerar constancia

CONSTANCIA:
├── Disponible si Estado = COMPLETADA
├── Genera PDF con:
│   ├── Título y logo
│   ├── Datos del participante
│   ├── Duración y modalidad
│   ├── Fecha de realización
│   ├── Porcentaje de asistencia
│   ├── Firma digital
│   └── Código QR de verificación
└── Opción descargar/enviar por email
```

### TypeScript Mejorado

```typescript
export class CapacitacionesComponent implements OnInit, OnDestroy {
  private ordenService = inject(OrdenServicioService);
  private pdfService = inject(PdfExportService);
  private notifyService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  // Signals
  capacitaciones = signal<CapacitacionResponse[]>([]);
  loading = signal<boolean>(false);
  filtroModalidad = signal<'virtual' | 'presencial' | ''>('');
  filtroEstado = signal<string>('');

  cargarDatos(skip: number = 0): void {
    this.loading.set(true);

    this.ordenService
      .obtenerCapacitaciones(skip, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.capacitaciones.set(response.capacitaciones);
          this.calcularPorcentajeAsistencia(response.capacitaciones);
        },
        error: (error) => console.error(error),
        complete: () => this.loading.set(false)
      });
  }

  private calcularPorcentajeAsistencia(items: CapacitacionResponse[]): void {
    items.forEach((item) => {
      if (item.cantidadParticipantes && item.cantidadParticipantes > 0) {
        const porcentaje =
          (item.asistenciasConfirmadas / item.cantidadParticipantes) * 100;
        item.porcentajeAsistencia = Math.round(porcentaje);
      }
    });
  }

  onGenerarConstancia(id: number): void {
    this.loading.set(true);

    this.ordenService
      .generarConstancia(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (capacitacion) => {
          this.notifyService.success('Constancia generada exitosamente');
          this.descargarConstancia(capacitacion);
          this.cargarDatos();
        },
        error: (error) => {
          this.notifyService.error('Error al generar constancia');
        },
        complete: () => this.loading.set(false)
      });
  }

  private descargarConstancia(capacitacion: CapacitacionResponse): void {
    const doc = {
      titulo: 'Constancia de Capacitación',
      tema: capacitacion.tema,
      duracion: capacitacion.duracionHoras,
      modalidad: capacitacion.esVirtual ? 'Virtual' : 'Presencial',
      fechaRealizacion: capacitacion.fechaCierre,
      porcentajeAsistencia: capacitacion.porcentajeAsistencia
    };

    this.pdfService.generarConstancia(doc).subscribe((pdf) => {
      // Descargar PDF
    });
  }
}
```

---

## 🖥️ Componente Servicios Técnicos

### Funcionalidades Principales

```
LISTADO:
├── Tabla con: Descripción, Tipo (Remoto/Presencial), Estado, Duración
├── Filtros por:
│   ├── Tipo de Servicio
│   ├── Estado
│   ├── Vehículo (si presencial)
│   └── Rango de fechas
├── Indicador visual: 🌐 Remoto | 🚗 Presencial
└── Botones especiales según tipo

REMOTO:
├── Mostrar: Software, Hora inicio, Hora fin, Duración real
├── Botón "Iniciar Sesión" (estado = PROGRAMADO)
│   └── Establece HoraInicio = now(), Estado = EN_PROGRESO
├── Botón "Finalizar Sesión" (estado = EN_PROGRESO)
│   └── Establece HoraFin = now(), Estado = COMPLETADO
│   └── Calcula DuracionReal
├── Link de control remoto (si aplica)
└── Registro de sesiones

PRESENCIAL:
├── Mostrar: Vehículo asignado, Ubicación, Duración estimada
├── Selector de Vehículo (con disponibilidad)
├── Mapa con ubicación
├── Botón "Confirmar Llegada"
├── Botón "Registrar Finalización"
└── Registro de desplazamiento

CREAR:
├── Descripción*
├── Tipo: Remoto / Presencial
├── Si Remoto:
│   ├── Software (TeamViewer, AnyDesk, Otro)
│   ├── Duración estimada
│   └── Link de sesión
├── Si Presencial:
│   ├── Vehículo*
│   ├── Ubicación*
│   └── Duración estimada
└── Cliente*, Agente*, Fecha programada*
```

### TypeScript Mejorado

```typescript
export class ServicioTecnicoComponent implements OnInit, OnDestroy {
  private ordenService = inject(OrdenServicioService);
  private vehiculoService = inject(VehiculoService);
  private notifyService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  // Signals
  servicios = signal<ServicioTecnicoResponse[]>([]);
  loading = signal<boolean>(false);
  filtroTipo = signal<'REMOTO' | 'PRESENCIAL' | ''>('');

  cargarDatos(skip: number = 0): void {
    this.loading.set(true);

    this.ordenService
      .obtenerServiciosTecnicos(skip, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.servicios.set(response.servicios);
          this.formatearDatos(response.servicios);
        },
        error: (error) => console.error(error),
        complete: () => this.loading.set(false)
      });
  }

  private formatearDatos(items: ServicioTecnicoResponse[]): void {
    items.forEach((item) => {
      // Formatear duración: "2 horas 30 minutos"
      if (item.duracionMinutos) {
        const horas = Math.floor(item.duracionMinutos / 60);
        const minutos = item.duracionMinutos % 60;
        item.duracionFormatted =
          `${horas > 0 ? horas + ' hora' + (horas > 1 ? 's' : '') : ''}` +
          `${minutos > 0 ? ' ' + minutos + ' minuto' + (minutos > 1 ? 's' : '') : ''}`;
      }

      // Calcular duración real si está completado
      if (item.horaInicio && item.horaFin) {
        const inicio = new Date(item.horaInicio);
        const fin = new Date(item.horaFin);
        item.duracionReal = fin.getTime() - inicio.getTime();
      }
    });
  }

  onIniciarSesion(id: number): void {
    const ahora = new Date();

    this.ordenService
      .registrarHoraInicio(id, ahora)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifyService.success('Sesión iniciada exitosamente');
          this.cargarDatos();
        },
        error: (error) => {
          this.notifyService.error('Error al iniciar sesión');
        }
      });
  }

  onFinalizarSesion(id: number): void {
    const ahora = new Date();

    this.ordenService
      .registrarHoraFin(id, ahora)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifyService.success('Sesión finalizada exitosamente');
          this.cargarDatos();
        },
        error: (error) => {
          this.notifyService.error('Error al finalizar sesión');
        }
      });
  }
}
```

---

## 🗂️ Componentes de Diálogo

### Patrón General para Diálogos

```typescript
import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-dialog-[modulo]',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dialog-[modulo].component.html',
  styleUrl: './dialog-[modulo].component.css'
})
export class Dialog[Modulo]Component {
  form!: FormGroup;
  loading = signal<boolean>(false);
  modo: 'crear' | 'editar' = 'crear';

  constructor(
    private dialogRef: MatDialogRef<Dialog[Modulo]Component>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.modo = data?.modo || 'crear';
    this.inicializarFormulario();

    if (this.modo === 'editar' && data?.registro) {
      this.form.patchValue(data.registro);
    }
  }

  private inicializarFormulario(): void {
    this.form = this.fb.group({
      clienteId: ['', [Validators.required]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      // ... otros campos
    });
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    this.loading.set(true);
    const formValue = this.form.value;

    // Devolver datos al componente padre
    this.dialogRef.close(formValue);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
```

---

## ❌ Manejo de Errores

### Estrategia Global

```typescript
// Crear ErrorHandler service
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  handle(error: any): string {
    // Clasificar error
    if (error.status === 400) {
      return 'Datos inválidos. Verifique el formulario';
    }
    if (error.status === 401) {
      return 'No autorizado. Por favor inicie sesión';
    }
    if (error.status === 403) {
      return 'No tiene permisos para realizar esta acción';
    }
    if (error.status === 404) {
      return 'Recurso no encontrado';
    }
    if (error.status === 409) {
      return 'Conflicto: ' + (error.error?.message || 'El recurso ya existe');
    }
    if (error.status === 500) {
      return 'Error del servidor. Intente más tarde';
    }
    if (error.status === 0) {
      return 'Error de conexión. Verifique su internet';
    }
    return error.error?.message || 'Error desconocido';
  }
}
```

---

## ✅ Validación de Formularios

### Validadores Personalizados

```typescript
// Custom Validators
export function validarCostoTotal(
  control: AbstractControl
): ValidationErrors | null {
  const costoManoObra = control.parent?.get('costoManoObra')?.value || 0;
  const costoRepuestos = control.parent?.get('costoRepuestos')?.value || 0;

  const costoTotal = costoManoObra + costoRepuestos;
  const valor = control.value;

  return valor === costoTotal ? null : { costoTotalInvalido: true };
}

// En formulario
this.form = this.fb.group({
  costoManoObra: [0, Validators.required],
  costoRepuestos: [0, Validators.required],
  iva: [0, Validators.required],
  costoTotal: [0, [Validators.required, validarCostoTotal]]
});
```

---

## 🧪 Testing

### Unit Tests Ejemplo

```typescript
describe('ReparacionesComponent', () => {
  let component: ReparacionesComponent;
  let service: OrdenServicioService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReparacionesComponent],
      providers: [
        {
          provide: OrdenServicioService,
          useValue: jasmine.createSpyObj('OrdenServicioService', [
            'obtenerReparaciones'
          ])
        }
      ]
    }).compileComponents();

    component = TestBed.createComponent(ReparacionesComponent).componentInstance;
    service = TestBed.inject(OrdenServicioService);
  });

  it('debe cargar reparaciones al inicializar', (done) => {
    const mockResponse = {
      reparaciones: [],
      total: 0
    };

    (service.obtenerReparaciones as jasmine.Spy).and.returnValue(
      of(mockResponse)
    );

    component.ngOnInit();

    expect(component.reparaciones()).toEqual([]);
    expect(component.totalElementos()).toBe(0);
    done();
  });
});
```

---

## 📚 Referencias y Recursos

- [Angular Signals](https://angular.io/api/core/signal)
- [RxJS Operators](https://rxjs.dev/api)
- [Material Design](https://material.io)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript](https://www.typescriptlang.org)

---

**Última Actualización:** 2026-01-13  
**Maintainer:** Development Team
