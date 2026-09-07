import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ConfiguracionTabsNavegation {
    id: string;
    nombreTab: string;
    ruta: string;
    habilitado: boolean;
}

@Component({
    selector: 'app-tab',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './tabsNavegacion.component.html',
    styleUrls: ['./tabsNavegacion.component.css']
})
export class TabsNavegacion {
    @Input() fondoBlanco: boolean = true;
    @Input() tabs: ConfiguracionTabsNavegation[] = [];
    @Input() tabActivaId: string = '';
    @Input() usarRouterLink: boolean = true; // Nuevo: controla si usa routerLink
    
    @Output() buttonClick = new EventEmitter<void>();
    @Output() tabSeleccionada = new EventEmitter<string>();

    onButtonClick(): void {
        this.buttonClick.emit();
    }

    seleccionarTab(tab: ConfiguracionTabsNavegation, event?: Event): void {
        if (event) {
            event.preventDefault(); // Previene navegación si hay evento
        }
        
        console.log('Tab seleccionado:', tab.id);
        if (tab.habilitado) {
            this.tabActivaId = tab.id;
            this.tabSeleccionada.emit(tab.id);
        }
    }
}