import { Component, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../atoms/icono/icono.component';

interface AlertConfig {
    icon: string;
    iconColor: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    closeButtonClasses: string;
}

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [CommonModule, UiIconComponent],
    template: `
        @if (visible) {
            <div 
                class="flex p-4 rounded-lg border justify-between items-center shadow-sm transition-all duration-200 hover:shadow-md" 
                [ngClass]="alertClasses" 
                role="alert" 
                [attr.aria-label]="'Alerta de ' + tipo">
              <div class=" flex gap-1">
                <!-- Icono de la alerta -->
                @if(mostrarIcono){
                    <app-ui-icono
                        [name]="alertConfig.icon"
                        size="size-5"
                        [color]="alertConfig.iconColor"
                        class="mr-3 mt-0.5 flex-shrink-0">
                    </app-ui-icono>
                }
                <!-- Contenido de la alerta -->
                <div class="flex-1" [ngClass]="{'ml-0': !mostrarIcono}">
                    <!-- Título de la alerta -->
                    @if (titulo) {
                      <h4 class="text-base font-medium mb-1" [ngClass]="alertConfig.textColor">
                        {{ titulo }}
                      </h4>
                    }
                    <!-- Descripción de la alerta -->
                    @if (descripcion) {
                      <p class="text-sm" [ngClass]="alertConfig.textColor">
                        {{ descripcion }}
                      </p>                  
                    }
                    <!-- Contenido proyectado (para contenido más complejo) -->
                    @if (!titulo && !descripcion) {
                      <ng-content></ng-content>
                    }
                </div>
              </div>
                <!-- Botón de cierre opcional -->
                @if(cerrable){
                    <button
                        type="button"
                        class="ml-4 -my-1.5 -mr-2 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                        [ngClass]="alertConfig.closeButtonClasses"
                        (click)="cerrarAlerta()"
                        aria-label="Cerrar alerta">
                        <app-ui-icono
                            name="x-mark"
                            size="size-4"
                            [color]="alertConfig.iconColor">
                        </app-ui-icono>
                    </button>
                }
            </div>
        }
    `
})
export class UiAlertComponent implements OnChanges {
    @Input() tipo: 'error' | 'warning' | 'info' | 'success' = 'info';
    @Input() mostrarIcono: boolean = true;
    @Input() cerrable: boolean = false;
    @Input() autoCerrar: number = 0; // En milisegundos (0 = no se cierra automáticamente)
    @Input() visible: boolean = true;
    @Input() titulo: string = 'Titulo';
    @Input() descripcion: string = 'Descripción';
    @Output() onClose = new EventEmitter<void>();
    @Output() onTipoChange = new EventEmitter<string>();

    public alertConfig!: AlertConfig;
    public alertClasses: string = '';
    private autoCloseTimeout: any;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['tipo']) {
            this.actualizarConfiguracion();
            this.onTipoChange.emit(this.tipo);
        }

        if (changes['autoCerrar'] && this.autoCerrar > 0) {
            this.programarCierreAutomatico();
        }
        
        if (changes['tipo'] && !this.visible) {
            this.visible = true;
        }
    }

    ngOnInit(): void {
        this.actualizarConfiguracion();
        
        if (this.autoCerrar > 0) {
            this.programarCierreAutomatico();
        }
    }

    private actualizarConfiguracion(): void {
        switch (this.tipo) {
            case 'error':
                this.alertConfig = {
                    icon: 'x-circle',
                    iconColor: 'text-red-600',
                    bgColor: 'bg-red-50',
                    textColor: 'text-red-900',
                    borderColor: 'border-red-300',
                    closeButtonClasses: 'hover:bg-red-200 focus:ring-red-500'
                };
                break;

            case 'warning':
                this.alertConfig = {
                    icon: 'exclamation-triangle',
                    iconColor: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    textColor: 'text-amber-900',
                    borderColor: 'border-amber-300',
                    closeButtonClasses: 'hover:bg-amber-200 focus:ring-amber-500'
                };
                break;

            case 'info':
                this.alertConfig = {
                    icon: 'information-circle',
                    iconColor: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-900',
                    borderColor: 'border-blue-300',
                    closeButtonClasses: 'hover:bg-blue-200 focus:ring-blue-500'
                };
                break;

            case 'success':
                this.alertConfig = {
                    icon: 'check-circle',
                    iconColor: 'text-emerald-600',
                    bgColor: 'bg-emerald-50',
                    textColor: 'text-emerald-900',
                    borderColor: 'border-emerald-300',
                    closeButtonClasses: 'hover:bg-emerald-200 focus:ring-emerald-500'
                };
                break;

            default:
                this.alertConfig = {
                    icon: 'information-circle',
                    iconColor: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-900',
                    borderColor: 'border-blue-300',
                    closeButtonClasses: 'hover:bg-blue-200 focus:ring-blue-500'
                };
        }

        // Solo aplicamos bgColor y borderColor al contenedor
        // El textColor lo manejamos en los componentes de tipografía
        this.alertClasses = `${this.alertConfig.bgColor} ${this.alertConfig.borderColor}`;
    }

    private programarCierreAutomatico(): void {
        if (this.autoCloseTimeout) {
            clearTimeout(this.autoCloseTimeout);
        }

        if (this.visible && this.autoCerrar > 0) {
            this.autoCloseTimeout = setTimeout(() => {
                this.cerrarAlerta();
            }, this.autoCerrar);
        }
    }

    cerrarAlerta(): void {
        if (this.autoCloseTimeout) {
            clearTimeout(this.autoCloseTimeout);
            this.autoCloseTimeout = null;
        }
        
        this.visible = false;
        this.onClose.emit();
    }

    cambiarTipo(nuevoTipo: 'error' | 'warning' | 'info' | 'success'): void {
        this.tipo = nuevoTipo;
        this.actualizarConfiguracion();
    }

    mostrar(): void {
        this.visible = true;
        if (this.autoCerrar > 0) {
            this.programarCierreAutomatico();
        }
    }

    ocultar(): void {
        this.cerrarAlerta();
    }
    
    ngOnDestroy(): void {
        if (this.autoCloseTimeout) {
            clearTimeout(this.autoCloseTimeout);
        }
    }
}