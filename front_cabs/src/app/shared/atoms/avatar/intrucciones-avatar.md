# Componente UI-Avtar

Componente reutilizable del avatar, para reutlizarlos en varios lugares . 

Componente **standalone** de Angular que muestra un **avatar con las iniciales del usuario autenticado**.  
El componente se conecta directamente al `SecureAuthService` y **se actualiza en tiempo real** cuando cambia el usuario.

No requiere configuración adicional ni props.

# Instalación

```typescript

import { UiAvatarComponent } from './ruta/atomic/avatar/avatar.component';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [UiAvatarComponent],
  // ...
})
```
# Propiedades internas

## Estas propiedades son de uso interno y no deben modificarse desde fuera:
  **Propiedad	Tipo	Descripción** 

| Propiedad  | Tipo                | Descripción                                              |
| ---------- | ------------------- | -------------------------------------------------------- |
| `initials` | `string`            | Iniciales que se muestran en el avatar (`U` por defecto) |
| `auth`     | `SecureAuthService` | Servicio que proporciona el usuario autenticado          |
| `sub`      | `Subscription`      | Maneja la suscripción a cambios del usuario              |
| `cdr`      | `ChangeDetectorRef` | Fuerza la actualización de la vista                      |

# Consideraciones Importantes

El tamaño del avatar siempre se controla desde el contenedor

No soporta imagen de perfil

Requiere SecureAuthService configurado

No debe usarse en contextos sin autenticación





