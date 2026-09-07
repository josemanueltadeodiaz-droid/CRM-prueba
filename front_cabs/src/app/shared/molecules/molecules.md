# 🧬 Molecules – Combinaciones Simples

> Las **moléculas** son combinaciones de átomos que trabajan juntos como una unidad funcional. Son más complejas que los átomos, pero aún simples y reutilizables.

## Indice de moleculas
- [Alert](#alert)
- [barraGrafica](#barragrafica)
- [Card](#card)
- [Detail-feild](#detail-field)
- [Detail-section](#detail-section)
- [Etiqueta](#etiqueta)
- [Filter-checkbox](#filter-checkbox)
- [Filter-field](#Filter-field)
- [Etiqueta](#Etiqueta)
- [Form-info-alert](#form-info-alert)
- [From-section](#form-section)
- [Header](#header)
- [HeaderTab](#HeaderTab)
- [Input](#input)
- [Loading-overlay](#loading-overlay)
- [Score-display](#score-display)
- [Tabla-base](#tabla-base)
- [TabsNavegacion](#tabsNavegacion)

## 🎯 Propósito

- Componer átomos para crear bloques funcionales
- Encapsular lógica visual mínima
- Reutilizarse en organismos o templates

# Ejemplo de Importacion General

```typescript
import { NombreDeLaMolecula } from 'rita/a/la/molecula/molecula.component';

@Component({
    selector: 'app-mi-componente',
    standalone: true,
    impoert: [ NombreDeLaMolecula ],
    //..... 
})
```
**Uso:**
```html
<app-ui-nombre-de-la-molecula>
```
## Alert


## 📁 Ejemplos

- `input-group/` – Label + input + botón
- `card/` – Contenedor con título, contenido y acciones
- `form-field/` – Campo de formulario con validación

## ✅ Buenas Prácticas

- Componer solo de átomos
- Mantener la lógica simple y visual
- Ser reutilizable en múltiples contextos
- Configurable mediante `@Input()` y `@Output()`

## 💡 Ejemplo de uso

``` html
<app-ui-input-group label="Correo" type="email" botonTexto="Enviar"></app-ui-input-group>
```
