import { Component, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UitipografiaComponent } from '../../~exports/detail-view.index';
import { UiIconComponent } from '../../~exports/detail-view.index';

@Component({
    selector: 'app-header-modal',
    standalone: true,
    imports: [CommonModule, UitipografiaComponent, UiIconComponent],
    templateUrl: './header-modal.component.html',
})
export class UiHeaderModal {
    @Input() titulo: string = 'Encabezado';
    @Input() descripcion: string = 'descripcion';
    
    // EventEmitter para notificar cuando se cierra el modal
    @Output() cerrarModal = new EventEmitter<void>();

    /**
     * Método que se ejecuta al hacer clic en el botón de cerrar
     */
    onButtonClick(): void {
        this.cerrarModal.emit(); // Emite el evento para cerrar el modal
    }
}