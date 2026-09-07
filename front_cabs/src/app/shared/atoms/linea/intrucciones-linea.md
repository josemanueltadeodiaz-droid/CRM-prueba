# Componente UI-linea

El **UiDividerComponent** es un componente reutilizable que permite mostrar líneas divisorias **horizontales o verticales**, ideal para separar secciones visuales dentro de la interfaz de usuario.

Componente reutilizable de las lineas separadoreas, para reutlizarlos en varios lugares. 


# Instalación

```typescript

import { UiDividerComponent } from './ruta/atomic/linea/linea.component';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  imports: [UiDividerComponent],
  // ...
})
```


# Uso
## Divisor horizontal (por defecto)
```html
  </app-ui-divider>
```

## Divisor vertical

```html
  <app-ui-divider [horizontal]="false"></app-ui-divider>
```

## Características

- 📏 Soporta divisor **horizontal** y **vertical**
- 🔁 Reutilizable en cualquier componente
- 🎨 Usa variables CSS para el color de la línea
- 🧩 Standalone component (Angular moderno)

---
## Propiedades (@Input)

| Propiedad  | Tipo    | Valor por defecto | Descripción                                                                |
| ---------- | ------- | ----------------- | -------------------------------------------------------------------------- |
| horizontal | boolean | `true`            | Define la orientación del divisor. `true` = horizontal, `false` = vertical |

