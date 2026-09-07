import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UiIconComponent } from '../icono/icono.component';

@Component({
  selector: 'app-ui-boton',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './boton.component.html',
})
export class UiBotonComponent {
  // Propiedades de entrada básicas
  @Input() variante: string = 'primario';
  @Input() texto: string = 'Botón';
  @Input() estaCargando: boolean = false;
  @Input() estaDeshabilitado: boolean = false;
  @Input() tipo: 'button' | 'submit' | 'reset' = 'button';
  @Input() anchoCompleto: boolean = true;
  @Input() mostrarIcono: boolean = false; // ← Ahora se respeta correctamente
  @Input() visualizarTexto: boolean = true;

  @Input() textoAlCargar?: string;
  @Input() clasesAdicionales?: string;
  @Input() tamano: 'xs' | 'sm' | 'md' | 'lg' = 'md';

  // PROPIEDADES PARA PERSONALIZACIÓN DE COLORES
  @Input() colorBorde?: string;
  @Input() colorTexto?: string;
  @Input() colorIcono?: string;
  @Input() colorFondo?: string;
  @Input() colorHoverFondo?: string;
  @Input() colorHoverBorde?: string;
  @Input() anchoBorde?: string;

  // PROPIEDAD PARA ICONO PERSONALIZADO DE HEROICONS
  @Input() nombreIcono?: string;
  @Input() tamanoIcono: string = 'h-5 w-5';

  // Evento de salida
  @Output() alClickear = new EventEmitter<Event>();
  iconoPersonalizado: any;

  constructor(private sanitizer: DomSanitizer) { }

  // Método para sanitizar el HTML del icono personalizado
  get iconoSanitizado(): SafeHtml | null {
    if (this.iconoPersonalizado) {
      return this.sanitizer.bypassSecurityTrustHtml(this.iconoPersonalizado);
    }
    return null;
  }

  // Método para manejar el click
  manejarClick(evento: Event): void {
    if (!this.estaDeshabilitado && !this.estaCargando) {
      this.alClickear.emit(evento);
    }
  }

  // Obtener estilos personalizados
  get estilosPersonalizados(): { [key: string]: string } {
    const estilos: { [key: string]: string } = {};

    if (this.colorBorde) {
      estilos['border-color'] = this.colorBorde;
    }
    if (this.colorTexto) {
      estilos['color'] = this.colorTexto;
    }
    if (this.colorFondo) {
      estilos['background'] = this.colorFondo;
      estilos['background-color'] = this.colorFondo;
    }
    if (this.anchoBorde) {
      estilos['border-width'] = this.anchoBorde;
    }

    return estilos;
  }

  // Obtener color para el icono
  get colorIconoClase(): string {
    if (this.colorIcono) {
      return '';
    }
    return 'text-current';
  }

  // Obtener atributos hover personalizados
  get atributosHover(): string {
    if (this.colorHoverFondo || this.colorHoverBorde) {
      return 'hover-personalizado';
    }
    return '';
  }

  // Método para obtener el icono según la variante
  obtenerIconoVariante(): string {
    const iconosVariante: { [key: string]: string } = {
      'ver': 'eye',
      'editar': 'pencil-square',
      'eliminar': 'x-circle',
      'guardar': 'check-circle',
      'cancelar': 'x-mark',
      'descargar': 'arrow-down-tray',
      'compartir': 'paper-airplane',
      'buscar': 'magnifying-glass',
      'cerrar': 'x-mark',
      'info': 'information-circle'
    };

    return iconosVariante[this.variante] || 'check';
  }

  // CORRECCIÓN: Método actualizado para respetar mostrarIcono = false
  get debeMotrarIconoPredeterminadoVariante(): boolean {
    // Si mostrarIcono es explícitamente false, no mostrar icono predeterminado
    if (this.mostrarIcono === false) {
      return false;
    }

    const variantesConIcono = ['ver', 'editar', 'eliminar', 'guardar', 'cancelar',
      'descargar', 'compartir', 'buscar', 'cerrar', 'info'];
    return variantesConIcono.includes(this.variante);
  }

  // CORRECCIÓN: Método actualizado para verificar correctamente si debe mostrar algún icono
  get debeMostrarIcono(): boolean {
    // Si mostrarIcono es explícitamente false, NO mostrar ningún icono
    if (this.mostrarIcono === false) {
      return false;
    }

    // Si hay un nombreIcono especificado, mostrarlo
    if (this.nombreIcono) {
      return true;
    }

    // Si mostrarIcono es true, mostrarlo
    if (this.mostrarIcono === true) {
      return true;
    }

    // Si la variante tiene icono predeterminado, mostrarlo
    return this.debeMotrarIconoPredeterminadoVariante;
  }

  // Método para obtener el nombre del icono a usar
  get nombreIconoFinal(): string {
    if (this.nombreIcono) {
      return this.nombreIcono;
    }
    if (this.debeMotrarIconoPredeterminadoVariante) {
      return this.obtenerIconoVariante();
    }
    return 'sparkles'; // icono por defecto
  }

  // Método para obtener las clases de Tailwind según la variante
  obtenerClasesTailwind(): string {
    const clasesBase = `
      font-semibold rounded-sm
      transition-all duration-300
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      flex justify-center items-center gap-2
      cursor-pointer
    `;

    let clasesTamano = '';
    switch (this.tamano) {
      case 'xs':
        clasesTamano = 'py-1 px-2 text-xs';
        break;
      case 'sm':
        clasesTamano = 'py-1.5 px-3 text-sm';
        break;
      case 'md':
        clasesTamano = 'py-2.5 px-4 text-sm';
        break;
      case 'lg':
        clasesTamano = 'py-3.5 px-6 text-base';
        break;
    }

    const clasesAncho = this.anchoCompleto ? 'w-full' : '';

    if (this.tieneColoresPersonalizados()) {
      const clasesVariante = `
        border-2 border-solid
        ${this.atributosHover}
      `;

      const todasLasClases = `
        ${clasesBase}
        ${clasesAncho}
        ${clasesVariante}
        ${this.clasesAdicionales || ''}
      `.replace(/\s+/g, ' ').trim();

      return todasLasClases;
    }

    let clasesVariante = '';
    switch (this.variante) {
      case 'primario':
        clasesVariante = `
          bg-gradient-to-r from-blue-600 to-blue-800
          text-white
          active:scale-[0.98]
          focus:ring-blue-500/50
        `;
        break;

      case 'secundario':
        clasesVariante = `
          bg-white text-blue-600
          border-2 border-blue-600
          active:scale-[0.98]
          rounded-lg px-6 py-3 font-semibold transition-all duration-300
        `;
        break;

      case 'terciario':
        clasesVariante = `
          text-blue-600 underline underline-offset-4 decoration-blue-600
        `;
        break;

      case 'ver':
        clasesVariante = `
          bg-gradient-to-r from-blue-500 to-blue-600
          text-white
          hover:from-blue-600 hover:to-blue-700
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-blue-400/50
        `;
        break;

      case 'editar':
        clasesVariante = `
          bg-gradient-to-r from-blue-500 to-blue-700
          text-white
          hover:from-blue-600 hover:to-blue-800
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-blue-400/50
        `;
        break;

      case 'eliminar':
        clasesVariante = `
          bg-gradient-to-r from-red-500 to-red-700
          text-white
          hover:from-red-600 hover:to-red-800
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-red-400/50
        `;
        break;

      case 'guardar':
        clasesVariante = `
          bg-gradient-to-r from-green-500 to-green-700
          text-white
          hover:from-green-600 hover:to-green-800
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-green-400/50
        `;
        break;

      case 'cancelar':
        clasesVariante = `
          bg-zinc-500
          text-white
          hover:from-gray-600 hover:to-gray-700
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-gray-400/50
        `;
        break;

      case 'descargar':
        clasesVariante = `
          bg-gradient-to-r from-purple-500 to-purple-700
          text-white
          hover:from-purple-600 hover:to-purple-800
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-purple-400/50
        `;
        break;

      case 'compartir':
        clasesVariante = `
          bg-gradient-to-r from-teal-500 to-teal-600
          text-white
          hover:from-teal-600 hover:to-teal-700
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-teal-400/50
        `;
        break;

      case 'buscar':
        clasesVariante = `
          bg-gradient-to-r from-blue-600 to-slate-700
          text-white
          hover:from-blue-700 hover:to-slate-800
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-blue-400/50
        `;
        break;

      case 'cerrar':
        clasesVariante = `
          bg-white
          border
          border-neutral-200
          hover:bg-neutral-200
          text-gray-700
        `;
        break;

      case 'info':
        clasesVariante = `
          bg-gradient-to-r from-sky-500 to-blue-600
          text-white
          hover:from-sky-600 hover:to-blue-700
          hover:shadow-xl hover:scale-[1.02]
          active:scale-[0.98]
          focus:ring-sky-400/50
        `;
        break;
      case 'icono':
        clasesVariante = `
          text-black
          cursor-pointer
          hover:bg-stone-200
        `;
        break;
      case 'enlace':
        clasesVariante = `
          text-blue-500
          cursor-pointer
          underline          
        `;
    }
    const todasLasClases = `
      ${clasesBase}
      ${clasesTamano}
      ${clasesAncho}
      ${clasesVariante}
      ${this.clasesAdicionales || ''}
    `.replace(/\s+/g, ' ').trim();

    return todasLasClases;
  }

  // Verificar si tiene colores personalizados
  private tieneColoresPersonalizados(): boolean {
    return !!(
      this.colorBorde ||
      this.colorTexto ||
      this.colorIcono ||
      this.colorFondo ||
      this.colorHoverFondo ||
      this.colorHoverBorde
    );
  }

  // Método para determinar si el botón debe estar deshabilitado
  estaInactivo(): boolean {
    return this.estaDeshabilitado || this.estaCargando;
  }

  // Método para obtener el texto a mostrar
  obtenerTexto(): string {
    if (this.estaCargando && this.textoAlCargar) {
      return this.textoAlCargar;
    }
    return this.texto;
  }
}