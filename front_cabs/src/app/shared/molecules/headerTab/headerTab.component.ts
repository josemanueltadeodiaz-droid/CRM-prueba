import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UitipografiaComponent } from '../../atoms/tipografia/tipografia.component';
import { UiBotonComponent } from '../../atoms/boton/boton.component';

@Component({
    selector: 'app-ui-header-tab',
    standalone: true,
    imports: [CommonModule, UitipografiaComponent, UiBotonComponent],
    templateUrl: './headerTab.component.html',
     // Opcional si quieres archivo de estilos separado
})
export class UiHeaderTabsComponent {
    @Input() titulo: string = '';
    @Input() descripcion: string = '';
    @Input() buttonLabel: string = '';

    @Input() visualizarDescripcion: boolean = true;
    @Input() visualizarButton: boolean = true;
    @Input() fondoBlanco: boolean = true; // Nueva propiedad para controlar el fondo
    
    @Output() buttonClick = new EventEmitter<void>();

    onButtonClick(): void {
        this.buttonClick.emit();
    }
}