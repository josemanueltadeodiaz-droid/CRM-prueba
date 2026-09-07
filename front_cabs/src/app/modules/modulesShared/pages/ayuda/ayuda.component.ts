import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiIconComponent } from '../../../../shared/~exports/detail-view.index';

interface Pregunta {
  id: string;
  texto: string;
  respuesta: string;
  categoriaId: string;
  abierta: boolean;
  votosPositivos: number;
  votosNegativos: number;
}

@Component({
  selector: 'app-centro-ayuda',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent],
  templateUrl: 'ayuda.component.html'
})
export class CentroAyudaComponent {
  terminoBusqueda = '';
  categoriaActiva = 'todos';
  
  categorias = [
    { id: 'todos', nombre: 'Todos', icono: 'home', cantidad: 0 },
    { id: 'catalogo', nombre: 'Catálogo Base', icono: 'cube', cantidad: 0 },
    { id: 'cotizaciones', nombre: 'Cotizaciones', icono: 'document-text', cantidad: 0 },
    { id: 'metricas', nombre: 'Métricas', icono: 'chart-bar', cantidad: 0 },
    { id: 'general', nombre: 'General', icono: 'cog', cantidad: 0 }
  ];

  preguntas: Pregunta[] = [
    // ==================== CATÁLOGO BASE ====================
    {
      id: 'c1',
      texto: '¿Cómo dar de alta un nuevo producto en el catálogo?',
      respuesta: 'Por el momento no puedes dar de alta un producto desde este sistema. Debes hacerlo directamente desde <strong>CONTPAQi Comercial</strong>.',
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'c2',
      texto: '¿Puedo editar la información de un producto existente?',
      respuesta: 'Por el momento no puedes editar un producto desde este sistema. Debes ingresar al sistema de <strong>CONTPAQi Comercial</strong> para realizar modificaciones.',
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'c3',
      texto: '¿Explicación sobre el modal de productos?',
      respuesta: `
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Encabezado:</strong> Muestra el código del producto</li>
          <li><strong>Información general:</strong> Nombre, estado (activo/inactivo), código, costo estándar</li>
          <li><strong>Precios:</strong> Listado de precios que tiene ese producto</li>
          <li><strong>Costos e impuestos:</strong> Costo estándar y margen de utilidad</li>
          <li><strong>Información adicional:</strong> Control de existencia (controlado/sin control), tipo de producto (servicio/producto), clave SAT</li>
        </ul>
      `,
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'c4',
      texto: '¿Cómo dar de alta un nuevo cliente en el catálogo?',
      respuesta: 'Por el momento no puedes dar de alta un cliente desde este sistema. Debes ingresar a <strong>CONTPAQi Comercial</strong> para darlo de alta.',
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'c5',
      texto: '¿Puedo editar la información de un cliente existente?',
      respuesta: 'Por el momento no puedes modificar la información de un cliente en este sistema. Debes ingresar a <strong>CONTPAQi Comercial</strong> para editar su información.',
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'c6',
      texto: '¿Explicación sobre el detalle de cliente?',
      respuesta: `
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Encabezado:</strong> RFC del cliente</li>
          <li><strong>Información general:</strong> Nombre, código, estado (activo/inactivo), ubicación</li>
          <li><strong>Información de contacto:</strong> Teléfono, email principal</li>
          <li><strong>Detalles de ubicación:</strong> Calle, número exterior, número interior, colonia, código postal, ciudad, estado y país</li>
        </ul>
      `,
      categoriaId: 'catalogo',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },

    // ==================== COTIZACIONES ====================
    {
      id: 'cot1',
      texto: '¿Cómo crear una nueva cotización paso a paso?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>COMPAQi > Cotizaciones</strong></li>
          <li>Haz clic en <strong>"Crear Cotización"</strong></li>
          <li>Selecciona el cliente (o créalo rápidamente)</li>
          <li>Agrega productos buscando por código o nombre</li>
          <li>Ajusta cantidades, unidades, descuento y precios si es necesario</li>
          <li>Escribe una observación (opcional)</li>
          <li>Selecciona una fecha de vencimiento</li>
          <li>Aplica descuentos si aplica</li>
          <li>Revisa el total y haz clic en <strong>"Generar Cotización"</strong></li>
        </ol>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot2',
      texto: '¿Cómo enviar una cotización por email al cliente?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>COMPAQi > Cotizaciones</strong></li>
          <li>Haz clic en la cotización que deseas enviar</li>
          <li>Haz clic en el botón <strong>"Enviar Cotización"</strong></li>
          <li>Selecciona el correo registrado del cliente o personaliza el mensaje</li>
          <li>Haz clic en <strong>"Enviar Cotización"</strong></li>
        </ol>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot3',
      texto: '¿Puedo duplicar una cotización existente?',
      respuesta: 'No, por el momento no es posible duplicar una cotización.',
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot4',
      texto: '¿Qué hacer si me equivoqué en una cotización ya enviada?',
      respuesta: 'Si ya fue enviada, te recomendamos contactar al cliente por correo para informarle sobre el error y, si es necesario, generar una nueva cotización corregida.',
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot5',
      texto: '¿Cómo aplicar descuentos a una cotización?',
      respuesta: `
        <p>Puedes aplicar descuentos de dos formas:</p>
        <ul class="list-disc pl-5 mt-2">
          <li><strong>Porcentaje global:</strong> Al crear o editar una cotización</li>
          <li><strong>Por producto:</strong> Aplicando descuento individual en cada renglón</li>
        </ul>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot6',
      texto: '¿Cómo descargar una cotización?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>COMPAQi > Cotizaciones</strong></li>
          <li>Busca la columna <strong>"Acciones"</strong> en la tabla de cotizaciones</li>
          <li>Haz clic en el ícono de descarga (⬇️)</li>
          <li>Selecciona el tipo de descarga deseado</li>
        </ol>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot7',
      texto: '¿Cómo editar una cotización?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>COMPAQi > Cotizaciones</strong></li>
          <li>Haz clic en la cotización que deseas editar</li>
          <li>Realiza los cambios necesarios y guarda</li>
        </ol>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot8',
      texto: '¿Explicación del modal de cotizaciones?',
      respuesta: `
        <table class="min-w-full text-sm">
          <tr class="border-b"><td class="py-1 font-semibold">Encabezado</td><td>ID de la cotización</td></tr>
          <tr class="border-b"><td class="py-1 font-semibold">Información general</td><td>Estado y fecha de creación</td></tr>
          <tr class="border-b"><td class="py-1 font-semibold">Identificación</td><td>Serie, folio, factura asociada, fecha de vencimiento</td></tr>
          <tr class="border-b"><td class="py-1 font-semibold">Observaciones</td><td>Comentario general de la cotización</td></tr>
          <tr class="border-b"><td class="py-1 font-semibold">Cliente</td><td>Nombre del cliente y del agente que generó la cotización</td></tr>
          <tr class="border-b"><td class="py-1 font-semibold">Productos</td><td>Nombre, código, unidades, precio total y observaciones</td></tr>
          <tr><td class="py-1 font-semibold">Resumen</td><td>Subtotal, IVA y total</td></tr>
        </table>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'cot9',
      texto: '¿Cómo eliminar una cotización?',
      respuesta: `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3 text-sm">
          <strong>⚠️ Nota importante:</strong> Para eliminar una cotización, primero debes cancelarla.
        </div>
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>COMPAQi > Cotizaciones</strong></li>
          <li>Haz clic en la cotización que deseas eliminar</li>
          <li>Haz clic en el ícono de <strong>basura 🗑️</strong> en el encabezado</li>
        </ol>
        <p class="mt-2"><strong>Comportamiento:</strong></p>
        <ul class="list-disc pl-5">
          <li>Si la cotización <strong>no está cancelada</strong> → Se abrirá la opción de cancelar</li>
          <li>Si la cotización <strong>ya está cancelada</strong> → Se abrirá la opción de eliminar</li>
        </ul>
        <p class="mt-2">4. Confirma haciendo clic en <strong>"Sí, eliminar"</strong></p>
      `,
      categoriaId: 'cotizaciones',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },

    // ==================== MÉTRICAS ====================
    {
      id: 'm1',
      texto: '¿Qué métricas puedo ver en general?',
      respuesta: `
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Tendencias de cotizaciones</strong> - Evolución en el tiempo</li>
          <li><strong>Estado Actual</strong> - Situación actual de las cotizaciones</li>
          <li><strong>Análisis de monto</strong> - Montos totales y promedios</li>
        </ul>
      `,
      categoriaId: 'metricas',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'm2',
      texto: '¿Cómo descargar los datos de las métricas?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>CONTPAQi > Comercial</strong></li>
          <li>Selecciona las métricas que quieres visualizar</li>
          <li>Haz clic en <strong>"Descargar"</strong></li>
          <li>Selecciona el formato de descarga (Excel, CSV o PDF)</li>
        </ol>
      `,
      categoriaId: 'metricas',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },

    // ==================== PREGUNTAS GENERALES ====================
    {
      id: 'g1',
      texto: '¿Cómo buscar una cotización específica?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>CONTPAQi > Comercial > Cotizaciones</strong></li>
          <li>En la sección de filtros puedes filtrar por:
            <ul class="list-circle pl-5 mt-1">
              <li>Búsqueda por folio y cliente</li>
              <li>Estado (Activo/Inactivo)</li>
              <li>Tipo (Cotizaciones, Facturas, Orden de compra)</li>
              <li>Fecha de inicio y fin</li>
            </ul>
          </li>
          <li>Haz clic en el botón <strong>"Buscar"</strong></li>
        </ol>
      `,
      categoriaId: 'general',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'g2',
      texto: '¿Cómo crear un usuario en el sistema?',
      respuesta: `
        <ol class="list-decimal pl-5 space-y-1">
          <li>Ve a <strong>Configuración > Gestión de Usuarios</strong></li>
          <li>Haz clic en el botón <strong>"Crear Usuario"</strong></li>
          <li>Rellena el formulario de creación de usuario</li>
          <li>Haz clic en <strong>"Crear Usuario"</strong></li>
        </ol>
      `,
      categoriaId: 'general',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    },
    {
      id: 'g3',
      texto: '¿Explicación del modal de detalles de un usuario?',
      respuesta: `
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Encabezado:</strong> Muestra el nombre del usuario</li>
          <li><strong>Información general:</strong> Correo electrónico, teléfono y nombre completo</li>
          <li><strong>Rol y estado:</strong>
            <ul class="list-circle pl-5">
              <li>Rol: Administrador, Recepción o Soporte</li>
              <li>Estado: Activado/Desactivado</li>
            </ul>
          </li>
        </ul>
      `,
      categoriaId: 'general',
      abierta: false,
      votosPositivos: 0,
      votosNegativos: 0
    }
  ];

  get preguntasFiltradas(): Pregunta[] {
    let resultado = this.preguntas;
    
    // Filtrar por categoría
    if (this.categoriaActiva !== 'todos') {
      resultado = resultado.filter(p => p.categoriaId === this.categoriaActiva);
    }
    
    // Filtrar por búsqueda
    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.texto.toLowerCase().includes(termino) ||
        p.respuesta.toLowerCase().includes(termino)
      );
    }
    
    return resultado;
  }

  ngOnInit() {
    this.actualizarContadorCategorias();
  }

  actualizarContadorCategorias() {
    this.categorias.forEach(cat => {
      if (cat.id === 'todos') {
        cat.cantidad = this.preguntas.length;
      } else {
        cat.cantidad = this.preguntas.filter(p => p.categoriaId === cat.id).length;
      }
    });
  }

  seleccionarCategoria(categoriaId: string) {
    this.categoriaActiva = categoriaId;
  }

  togglePregunta(pregunta: Pregunta) {
    pregunta.abierta = !pregunta.abierta;
  }

  filtrarPreguntas() {
    // La lógica ya está en el getter preguntasFiltradas
  }

  getCategoriaColor(categoriaId: string): string {
    const colores: Record<string, string> = {
      catalogo: 'bg-blue-100 text-blue-700',
      cotizaciones: 'bg-green-100 text-green-700',
      metricas: 'bg-purple-100 text-purple-700',
      general: 'bg-gray-100 text-gray-700'
    };
    return colores[categoriaId] || 'bg-gray-100 text-gray-700';
  }

  getCategoriaNombre(categoriaId: string): string {
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || '';
  }

  copiarRespuesta(pregunta: Pregunta) {
    // Eliminar HTML de la respuesta para copiar texto plano
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pregunta.respuesta;
    const textoPlano = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(textoPlano);
    // Mostrar notificación
  }

  enviarCorreo(pregunta: Pregunta) {
    // Abrir modal o cliente de correo
  }

  reportarError(pregunta: Pregunta) {
    // Abrir modal para reportar error
  }

  votarUtil(pregunta: Pregunta) {
    pregunta.votosPositivos++;
  }

  votarNoUtil(pregunta: Pregunta) {
    pregunta.votosNegativos++;
  }
}