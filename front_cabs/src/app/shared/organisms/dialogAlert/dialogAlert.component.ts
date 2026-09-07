import { Component, Input, EventEmitter, inject, output, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UitipografiaComponent } from '../../~exports/detail-view.index';
import { UiIconComponent } from '../../~exports/detail-view.index';
import { UiInputComponent } from '../../~exports/filter-system.index';

@Component({
  selector: 'app-ui-dialog-alert',
  standalone: true,
  imports: [
    CommonModule,  
    UitipografiaComponent, 
    UiIconComponent, 
    UiInputComponent
  ],
  templateUrl: './dialogAlert.component.html',
})
export class UiDialogAlertComponent {
  // Tipo de modal 
  @Input() tipoAlerta: 'eliminar' | 'advertencia' | 'aprovado' = 'aprovado';
  
  // Textos del modal 
  @Input() titulo: string = 'Titulo'; 
  @Input() parrafo: string = 'Parrafo'; 
  @Input() textoBotonCerrar: string = 'Texto Cerra';
  @Input() textoBotonPrimario: string = 'Texto primario';
  
  // Input 
  // Visualizacion del input 
  @Input() visualizarInput: boolean = false;
  // Input para el texto 
  @Input() labelInput: string = '';
  @Input() inputObligatorio: boolean = false;
  @Input() plaseHolder: string = '';

  // Eventos omitidos 
  @Output() clicBotonSecundario = new EventEmitter<Event>();
  @Output() clicBotonPrimario = new EventEmitter<Event>();
  @Output() valueChange = new EventEmitter<string>();
}