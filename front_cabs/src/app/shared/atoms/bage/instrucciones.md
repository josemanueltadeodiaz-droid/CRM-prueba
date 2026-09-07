# Componente Badge Component

El **Badge Component** es un componente reutilizable de Angular que permite mostrar etiquetas informativas con distintos estilos e íconos según su tipo (success, info, warning, error, etc.).  
Es ideal para estados, notificaciones breves o indicadores visuales dentro de la interfaz.


# Instalación
Importa el componente dentro del componente donde lo vayas a utilizar:

```typescript

import { BadgeComponent } from './ruta/del/componente/badge.component';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [BadgeComponent],
})
export class MiComponente {}
```


## 📦 Características

- ✅ Componente **standalone**
- 🎨 Estilos dinámicos según el tipo de badge
- 🧩 Íconos integrados mediante `UiIconComponent`
- ♻️ Reutilizable en cualquier parte del proyecto
- ⚡ Fácil de configurar mediante `@Input()`

---

## Inputs disponibles

| Input   | Tipo     | Valores posibles                                 | Descripción                            |
| ------- | -------- | ------------------------------------------------ | -------------------------------------- |
| `tipo`  | `string` | `success`, `default`, `info`, `warning`, `error` | Define el estilo y el ícono del badge  |
| `Texto` | `string` | Cualquier texto                                  | Texto que se mostrará dentro del badge |

## Tipos de Badge

| Tipo      | Color    | Ícono                   |
| --------- | -------- | ----------------------- |
| `success` | Verde    | ✔️ check-circle         |
| `info`    | Azul     | ℹ️ information-circle   |
| `warning` | Amarillo | ⚠️ exclamation-triangle |
| `error`   | Rojo     | ❌ x-circle              |
| `default` | Gris     | ⚠️ exclamation-triangle |

### Dependencias
  Este componente depende de:

  - CommonModule
  - UiIconComponent


