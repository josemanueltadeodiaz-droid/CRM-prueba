# Componente UI-tipografia

UiDialogAlert es un componente de diálogo de confirmación diseñado para acciones críticas como eliminaciones. Solicita confirmación explícita del usuario antes de ejecutar operaciones irreversibles, integrando directamente con APIs REST mediante peticiones DELETE.

# Instalación

```typescript

import { UiDialogAlert, DialogData} from './ruta/organismos/dialogAlert/tipografia.component';

@Component({
  selector: 'app-dialog-alert',
  standalone: true,
  imports: [UiTipografiaComponent],
  // ...
})
```

# Propiedades (Inputs)
-------------------------------------------<-----------------------------------------------------------------------------------------------------------------------
| Propiedad           | Tipo               | Valores                                        |  POR Defecto | Descripción                                          |
|---------------------|--------------------|------------------------------------------------|--------------|------------------------------------------------------|
| `title`             | `string`           | `'-'`                                          | `'-'`        | Titulo principal del dialogo                         |
| `descripción`       | `string`           | Cualquier texto                                | `'-'`        | Descripción detallada de la acción                   |
| `description`       | `string`           | Cualquier texto                                | `'-'`        | Identificador único del elemento a eliminar          |
| `itemName`          | `number o string`  | Cualquier color de texto en tailwind           | `'""'`       | Identificador único del elemento a eliminar          |
| `apiEndpoint`       | `string`           | Cualquier color de texto en tailwind           | `'-'`        | Endpoint de la API (ej: /api/usuarios/)              |
| `onDelete`          | `(itemId) =>`      | undefined                                      | `'undefined'`| Identificador único del elemento a eliminar          |
-------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Uso Básico 

## Elimiacion Simple 
```ts
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UiDialogAlertComponent } from './dialogAlert.component';

@Component({
  selector: 'app-usuarios',
  template: `
    <button (click)="eliminarUsuario(123, 'Juan Pérez')">
      Eliminar Usuario
    </button>
  `
})
export class UsuariosComponent {
  constructor(private dialog: MatDialog) {}

  eliminarUsuario(id: number, nombre: string): void {
    const dialogRef = this.dialog.open(UiDialogAlertComponent, {
      data: {
        title: '¿Eliminar usuario?',
        description: `¿Estás seguro de eliminar a "${nombre}"? Esta acción no se puede deshacer.`,
        itemId: id,
        itemName: nombre,
        apiEndpoint: '/api/usuarios/'
      },
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.deleted) {
        console.log('Usuario eliminado:', result.itemId);
        // Actualizar UI o recargar datos
      }
    });
  }
}
```

## Con Callback Personalizado 
```ts
const dialogRef = this.dialog.open(UiDialogAlertComponent, {
  data: {
    title: 'Eliminar Producto',
    description: 'El producto será eliminado permanentemente.',
    itemId: productId,
    apiEndpoint: '/api/productos/',
    onDelete: (id) => {
      // Lógica adicional después de eliminar
      this.auditoriaService.registrarEliminacion('producto', id);
      this.notificacionService.mostrarExito('Producto eliminado');
    }
  }
});
```


## Con Callback Personalizado 
```ts
dialogRef.afterClosed().subscribe(result => {
  if (result?.deleted) {
    this.mostrarMensajeExito('Operación completada');
    this.recargarDatos();
  } else if (result?.error) {
    this.mostrarMensajeError(result.error.message);
  }
});
```