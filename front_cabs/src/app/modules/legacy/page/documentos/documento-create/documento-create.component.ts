import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CotizacionLegacyService } from '../../../../../core/services/cotizacion-legacy.service';
import { ClienteLegacyService } from '../../../../../core/services/cliente-legacy.service';
import { ProductoLegacyService } from '../../../../../core/services/producto-legacy.service';
import { CotizacionLegacyCreateRequest } from '../../../../../core/models/cotizacion-legacy.interface';
import { ClienteLegacyBusqueda } from '../../../../../core/models/cliente-legacy.interface';
import { ProductoLegacyBusqueda } from '../../../../../core/models/producto-legacy.interface';
import { GlobalContextService } from '../../../../../core/services/global-context.service';
import { UiIconComponent } from '../../../../../shared/~exports/detail-view.index';
import { UiBotonComponent } from '../../../../../shared/~exports/detail-view.index';

interface ProductoFormulario {
  idProducto: number;
  nombreProducto: string;
  codigoProducto: string;
  unidades: number;
  precio: number;
  descuentoImporte: number; // Descuento en valores absolutos
  subtotal: number; // Calculado: (unidades * precio) - descuento
  observaciones: string;
  idMovimiento?: number; // Para edición
}

@Component({
  selector: 'app-documento-create',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent, UiBotonComponent],
  templateUrl: './documento-create.component.html',
  styleUrl: './documento-create.component.css',
})
export class DocumentoCreateComponent implements OnInit {
  @Input() idDocumento?: number; // Input para modo edición

  // Signals
  loading = signal<boolean>(false);
  loadingIcon = signal<boolean>(false);
  loadingIconProductos = signal<boolean>(false);
  clientes = signal<ClienteLegacyBusqueda[]>([]);
  productos = signal<ProductoLegacyBusqueda[]>([]);
  productosSeleccionados = signal<ProductoFormulario[]>([]);

  // Búsqueda
  busquedaCliente = '';
  busquedaProducto = '';
  clienteSeleccionado: ClienteLegacyBusqueda | null = null;

  // Producto temporal
  productoTemporal: ProductoFormulario = {
    idProducto: 0,
    nombreProducto: '',
    codigoProducto: '',
    unidades: 1,
    precio: 0,
    descuentoImporte: 0,
    subtotal: 0,
    observaciones: '',
  };

  // Formulario principal
  formulario = {
    idCliente: 0,
    aplicarIVA: true,
    porcentajeIVA: 16,
    descuentoDoc1: 0,
    descuentoDoc2: 0,
    descuentoDoc3: 0,
    observaciones: '',
    referencia: '',
    fechaVencimiento: '',
    razonSocialManual: '',
  };

  constructor(
    private cotizacionService: CotizacionLegacyService,
    private clienteService: ClienteLegacyService,
    private productoService: ProductoLegacyService,
    private router: Router,
    private route: ActivatedRoute,
    private globalContext: GlobalContextService,
  ) {}

  ngOnInit(): void {
    // Verificar si hay ID en la ruta (si no se pasó por Input)
    if (!this.idDocumento) {
      const routeId = this.route.snapshot.paramMap.get('id');
      if (routeId) this.idDocumento = Number(routeId);
    }

    if (this.idDocumento) {
      this.cargarDatosEdicion(this.idDocumento);
    }
  }

  cargarDatosEdicion(id: number): void {
    this.loading.set(true);
    this.cotizacionService.obtenerPorId(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const data = res.data;
          // Llenar formulario
          this.formulario.idCliente = data.idCliente;
          this.formulario.observaciones = data.observaciones || '';
          this.formulario.referencia = data.referencia || '';
          this.formulario.porcentajeIVA =
            data.iva > 0 && data.subtotal > 0
              ? (data.iva / data.subtotal) * 100
              : 16;
          this.formulario.descuentoDoc1 = data.descuentoDoc1;
          this.formulario.descuentoDoc2 = data.descuentoDoc2;
          this.formulario.descuentoDoc3 = data.descuentoDoc3;

          // Fechas
          if (data.fechaVencimiento)
            this.formulario.fechaVencimiento =
              data.fechaVencimiento.split('T')[0];

          // Cliente manual (si aplica)
          if (data.idCliente === 832)
            this.formulario.razonSocialManual = data.razonSocial;

          // Precargar cliente visual
          this.clienteSeleccionado = {
            idCliente: data.idCliente,
            razonSocial: data.razonSocial,
            rfc: '', // No viene en el getById, pero se mostrará lo que haya
            ubicacion: '',
            codigoCliente: '',
            email: '',
            telefono: '',
          };
          this.busquedaCliente = `${data.razonSocial}`;

          // Mapear productos
          if (data.movimientos) {
            const productosForm = data.movimientos.map((m) => ({
              idProducto: m.idProducto,
              nombreProducto: m.nombreProducto,
              codigoProducto: m.codigoProducto,
              unidades: m.unidades,
              precio: m.precio,
              descuentoImporte: m.descuentoLinea, // Asumiendo descuento importe
              subtotal: m.neto,
              observaciones: m.observaciones || '',
              idMovimiento: m.idMovimiento, // GUARDAMOS ID MOVIMIENTO ORIGINAL
            }));
            this.productosSeleccionados.set(productosForm);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando cotización', err);
        this.loading.set(false);
        alert('Error al cargar la cotización para editar');
      },
    });
  }

  // ==================== BÚSQUEDA CLIENTES ====================

  buscarClientes(): void {
    this.loadingIcon.set(true);
    if (!this.busquedaCliente.trim()) {
      this.clientes.set([]);
      this.loadingIcon.set(false);
      return;
    }

    this.clienteService.buscarSimplificado(this.busquedaCliente).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.clientes.set(response.data);
        }
        this.loadingIcon.set(false);
      },
      error: (err) => {
        console.error('Error al buscar clientes:', err);
        this.loadingIcon.set(false);
      },
    });
  }

  seleccionarCliente(cliente: ClienteLegacyBusqueda): void {
    this.clienteSeleccionado = cliente;
    this.formulario.idCliente = cliente.idCliente;
    this.busquedaCliente = `${cliente.razonSocial} (${cliente.rfc}) (${cliente.ubicacion})`;
    this.clientes.set([]);

    // Si es público en general, inicializar con el nombre del cliente
    if (cliente.idCliente === 832) {
      this.formulario.razonSocialManual = cliente.razonSocial;
    } else {
      this.formulario.razonSocialManual = '';
    }
  }

  // ==================== BÚSQUEDA PRODUCTOS ====================

  buscarProductos(): void {
    this.loadingIconProductos.set(true);
    if (!this.busquedaProducto.trim()) {
      this.productos.set([]);
      this.loadingIconProductos.set(false);
      return;
    }

    this.productoService.buscarSimplificado(this.busquedaProducto).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.productos.set(response.data);
        }
        this.loadingIconProductos.set(false);
      },
      error: (err) => {
        console.error('Error al buscar productos:', err);
        this.loadingIconProductos.set(false);
      },
    });
  }

  seleccionarProducto(producto: ProductoLegacyBusqueda): void {
    this.productoTemporal = {
      idProducto: producto.idProducto,
      nombreProducto: producto.nombreProducto,
      codigoProducto: producto.codigoProducto,
      unidades: 1,
      precio: producto.precio,
      descuentoImporte: 0,
      subtotal: producto.precio,
      observaciones: '',
    };
    this.busquedaProducto = `${producto.codigoProducto} - ${producto.nombreProducto}`;
    this.productos.set([]);
    this.calcularSubtotalProducto();
  }

  // ==================== MANEJO DE PRODUCTOS ====================

  calcularSubtotalProducto(): void {
    const neto = this.productoTemporal.unidades * this.productoTemporal.precio;
    const descuento = neto * (this.productoTemporal.descuentoImporte / 100);
    this.productoTemporal.subtotal = neto - descuento;
  }

  agregarProducto(): void {
    if (this.productoTemporal.idProducto === 0) {
      alert('Debe seleccionar un producto');
      return;
    }

    if (this.productoTemporal.unidades <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    // Agregar a la lista
    this.productosSeleccionados.update((productos) => [
      ...productos,
      { ...this.productoTemporal },
    ]);

    // Resetear formulario de producto
    this.productoTemporal = {
      idProducto: 0,
      nombreProducto: '',
      codigoProducto: '',
      unidades: 1,
      precio: 0,
      descuentoImporte: 0,
      subtotal: 0,
      observaciones: '',
    };
    this.busquedaProducto = '';
  }

  cerrarProductoTemporal(): void {
    // Resetear producto temporal a valores por defecto
    this.productoTemporal = {
      idProducto: 0,
      nombreProducto: '',
      codigoProducto: '',
      unidades: 1,
      precio: 0,
      descuentoImporte: 0,
      subtotal: 0,
      observaciones: '',
    };
    // Limpiar campo de búsqueda
    this.busquedaProducto = '';

    // Opcional: Cerrar cualquier dropdown de resultados
    this.productos.set([]);
  }

  eliminarProducto(index: number): void {
    this.productosSeleccionados.update((productos) =>
      productos.filter((_, i) => i !== index),
    );
  }

  editarProducto(index: number): void {
    const producto = this.productosSeleccionados()[index];
    // Cargar en el formulario temporal
    this.productoTemporal = { ...producto };
    // Mostrar visualmente qué producto es
    this.busquedaProducto = `${producto.codigoProducto} - ${producto.nombreProducto}`;
    // Quitar de la lista para que al guardar no se duplique, sino que "vuelva" a entrar
    this.eliminarProducto(index);
    // Recalcular subtotal visual (por si acaso)
    this.calcularSubtotalProducto();
  }

  // ==================== CÁLCULOS ====================

  calcularSubtotalGeneral(): number {
    return this.productosSeleccionados().reduce(
      (sum, p) => sum + p.subtotal,
      0,
    );
  }

  calcularNetoConDescuentos(): number {
    const subtotal = this.calcularSubtotalGeneral(); // Usar subtotal calculado automáticamente
    const desc1 = subtotal * (this.formulario.descuentoDoc1 / 100);
    const desc2 = subtotal * (this.formulario.descuentoDoc2 / 100);
    const desc3 = subtotal * (this.formulario.descuentoDoc3 / 100);
    return subtotal - desc1 - desc2 - desc3;
  }

  calcularIVA(): number {
    // Siempre calcular IVA automáticamente
    const neto = this.calcularNetoConDescuentos();
    return neto * (this.formulario.porcentajeIVA / 100);
  }

  //Este es el total que se envia al backend
  calcularTotalConIVA(): number {
    return this.calcularNetoConDescuentos() + this.calcularIVA();
  }

  calcularTotalDescuentos(): number {
    return (
      (this.formulario.descuentoDoc1 || 0) +
      (this.formulario.descuentoDoc2 || 0) +
      (this.formulario.descuentoDoc3 || 0)
    );
  }

  // ==================== CREAR COTIZACIÓN ====================

  crearCotizacion(): void {
    // Validaciones
    if (this.formulario.idCliente === 0) {
      alert('❌ Debe seleccionar un cliente');
      return;
    }

    if (this.productosSeleccionados().length === 0) {
      alert('❌ Debe agregar al menos un producto');
      return;
    }

    // Variable para la razón social
    let razonSocial = '';

    // Validacion cliente 832 (Publico General) - Permitido ahora
    if (this.formulario.idCliente == 832) {
      if (this.formulario.razonSocialManual == '') {
        alert('❌ Debe ingresar una razón social');
        return;
      } else {
        razonSocial = this.formulario.razonSocialManual;
      }
    }

    this.loading.set(true);
    const cTotalCalculado = this.calcularTotalConIVA();

    // Mapeo común de producto
    const productosMap = this.productosSeleccionados().map((p: any) => ({
      idMovimiento: p.idMovimiento || null,
      idProducto: p.idProducto,
      idAlmacen: 0,
      unidades: p.unidades,
      precio: p.precio,
      descuentoImporte: p.descuentoImporte,
      observaciones: p.observaciones || null,
    }));

    if (this.idDocumento) {
      // --- MODO EDICIÓN ---
      const requestUpdate: any = {
        idDocumento: this.idDocumento,
        idCliente: this.formulario.idCliente,
        idAgente: this.globalContext.get('currentUser')?.idAgente,
        aplicarIVA: this.formulario.aplicarIVA,
        porcentajeIVA: this.formulario.porcentajeIVA,
        fechaVencimiento: this.formulario.fechaVencimiento,
        cTotal: cTotalCalculado,
        razonSocial: razonSocial,
        descuentoDoc1: this.formulario.descuentoDoc1 || null,
        descuentoDoc2: this.formulario.descuentoDoc2 || null,
        descuentoDoc3: this.formulario.descuentoDoc3 || null,
        observaciones: this.formulario.observaciones || null,
        referencia: this.formulario.referencia || null,
        productos: productosMap,
      };

      this.cotizacionService.editar(requestUpdate).subscribe({
        next: (response) => {
          this.loading.set(false);
          console.log(response);
          if (response.success && response.data) {
            console.log('✅ Cotización Editada Exitosamente');

            // Navegar con estado para mostrar notificación de edición
            this.router.navigate(['/legacy/operaciones/documentos'], {
              relativeTo: this.route,
              state: {
                action: 'edited',
                folio: response.data.folio,
                total: response.data.total,
              },
            });
          } else {
            alert(
              '❌ Error al editar cotización: ' +
                (response.message || 'Error desconocido'),
            );
          }
        },
        error: (err) => {
          this.loading.set(false);
          console.error('Error editando', err);
          alert(
            '❌ Error al editar cotización: ' +
              (err.error?.message || err.message || 'Error desconocido'),
          );
        },
      });
    } else {
      // --- MODO CREACIÓN ---
      const request: any = {
        idCliente: this.formulario.idCliente,
        idAgente: this.globalContext.get('currentUser')?.idAgente,
        aplicarIVA: this.formulario.aplicarIVA,
        porcentajeIVA: this.formulario.porcentajeIVA,
        fechaVencimiento: this.formulario.fechaVencimiento,
        cTotal: cTotalCalculado,
        razonSocial: razonSocial || null,
        descuentoDoc1: this.formulario.descuentoDoc1 || null,
        descuentoDoc2: this.formulario.descuentoDoc2 || null,
        descuentoDoc3: this.formulario.descuentoDoc3 || null,
        observaciones: this.formulario.observaciones || null,
        referencia: this.formulario.referencia || null,
        productos: productosMap,
      };

      this.cotizacionService.crear(request).subscribe({
        next: (response) => {
          this.loading.set(false);

          if (response.success && response.data) {
            console.log('✅ Cotización creada exitosamente');

            // Navegar con estado para mostrar notificación de creación
            this.router.navigate(['../'], {
              relativeTo: this.route,
              state: {
                action: 'created',
                folio: response.data.folio,
                total: response.data.total,
              },
            });
          } else {
            alert(
              '❌ Error al crear cotización: ' +
                (response.message || 'Error desconocido'),
            );
          }
        },
        error: (err) => {
          this.loading.set(false);
          console.error('Error creando cotización:', err);
          alert(
            '❌ Error: ' +
              (err.error?.message ||
                err.message ||
                'No se pudo crear la cotización'),
          );
        },
      });
    }
  }

  // ==================== UTILIDADES ====================

  cancelar(): void {
    this.router.navigate(['/legacy/operaciones/documentos'], {
      relativeTo: this.route,
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }
}
