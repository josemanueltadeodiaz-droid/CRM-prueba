# 🚀 GUÍA DE TESTING - Dialog Crear Vehículo
merge
## ✅ Cambios Realizados

### 1. **Component TypeScript** (`vehiculos-dialog.component.ts`)
- ✅ Mejorada validación completa en `crearVehiculo()` y `actualizarVehiculo()`
- ✅ Agregado logging detallado en cada paso del proceso
- ✅ Mejor manejo de errores con mensajes específicos por tipo de error
- ✅ Reseteo de formulario al cerrar el modal
- ✅ Validación temprana con mensajes claros

### 2. **Servicio VehiculoService** (`vehiculo.service.ts`)
- ✅ Agregado logging con `tap()` para ver cada paso
- ✅ Manejo centralizado de errores con `catchError()`
- ✅ Mejor trazabilidad de las peticiones HTTP

### 3. **Template HTML** (`vehiculos-dialog.component.html`)
- ✅ Mejor validación de inputs con `pattern` y `blur` events
- ✅ Conversión automática de placas a mayúsculas
- ✅ Mejor feedback visual durante la carga

---

## 🧪 PASOS PARA TESTEAR

### Paso 1: Compilar el Frontend
```bash
cd c:\Users\ANA\Documents\dev\MINECRAFT\front_cabs
ng serve
# O si usas build:
ng build
```

### Paso 2: Abrir DevTools (F12) y ir a Console
Deberías ver mensajes de debug como:
```
ℹ️ Inicializando nuevo vehículo
🔐 Obteniendo token CSRF...
✅ Token CSRF obtenido correctamente
```

### Paso 3: Llenar el Formulario de Creación

**Valores de Prueba:**
```
Nombre: Toyota Corolla 2020
Placas: ABC-123 (se convierte automáticamente a ABC-123)
Tipo: Sedán
Transmisión: Automática
Kilometraje: 45000
Es de Empresa: Sí
Activo: ✓ (marcado)
Observaciones: Vehículo de prueba
```

### Paso 4: Hacer Clic en "Crear Vehículo"

**En la Console deberías ver:**
```
🚀 Iniciando creación de vehículo...
🔐 Obteniendo token CSRF...
✅ Token CSRF obtenido correctamente
📋 DTO a enviar: {
    nombreVehiculo: "Toyota Corolla 2020",
    tipoVehiculo: "Sedán",
    transmision: "Automática",
    esDeEmpresa: true,
    placas: "ABC-123",
    kilometraje: 45000,
    activo: true,
    observaciones: "Vehículo de prueba"
}
📤 Enviando POST a /api/Vehiculos...
```

### Paso 5: Verificar en Network Tab

1. Abre DevTools > Network
2. Filtra por "XHR" (XMLHttpRequest)
3. Verifica que existe el request a `/api/Vehiculos`
4. Haz clic en el request y verifica:

**Request Headers:**
```
POST /api/Vehiculos HTTP/1.1
Host: 192.168.10.5:5176
Content-Type: application/json
X-XSRF-TOKEN: CfDJ8BoJ3pcT1y1JrsPj... (debe estar presente)
Authorization: Bearer <token>
X-Requested-With: XMLHttpRequest
```

**Request Payload (Body):**
```json
{
  "nombreVehiculo": "Toyota Corolla 2020",
  "tipoVehiculo": "Sedán",
  "transmision": "Automática",
  "esDeEmpresa": true,
  "placas": "ABC-123",
  "kilometraje": 45000,
  "activo": true,
  "observaciones": "Vehículo de prueba"
}
```

**Response Status:**
- ✅ `201 Created` - Éxito
- ❌ `400 Bad Request` - Validación del backend
- ❌ `403 Forbidden` - Problema CSRF
- ❌ `401 Unauthorized` - Token expirado

**Response Body (Éxito):**
```json
{
  "id": 1,
  "nombreVehiculo": "Toyota Corolla 2020",
  "tipoVehiculo": "Sedán",
  "transmision": "Automática",
  "esDeEmpresa": true,
  "placas": "ABC-123",
  "kilometraje": 45000,
  "activo": true,
  "observaciones": "Vehículo de prueba",
  "disponible": true,
  "creadoEn": "2026-01-05T10:30:00Z"
}
```

### Paso 6: Verificar Notificaciones

Después del POST exitoso, deberías ver:
1. Alert verde en el modal: "✅ Vehículo creado exitosamente"
2. Notificación toast (si está configurada)
3. Modal se cierra automáticamente después de 1.5 segundos
4. Evento `vehiculoCreado` se emite

---

## 🔍 DEBUGGING AVANZADO

### Si Fallar el CSRF Token
```javascript
// En la consola
// Ver si el token está en el servicio
localStorage.getItem('csrfToken')

// Ver si está en las cookies
document.cookie

// Ver logs del backend
// Deberías ver algo como:
// "CSRF Validation DEBUG for POST /api/Vehiculos: Header=CfDJ8BoJ3pcT1y1Jr..., Cookie=present..."
```

### Si Falla la Petición HTTP
```javascript
// Ver el error exacto en Network > Response
// Error 400 = Validación del backend
// Error 403 = CSRF
// Error 401 = Autenticación expirada
```

### Si el Modal no se Cierra
```javascript
// Verificar en la consola si hay errores
// El evento vehiculoCreado debería emitirse
// El componente padre debería escuchar este evento
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Console muestra: "🚀 Iniciando creación de vehículo..."
- [ ] Console muestra: "✅ Token CSRF obtenido correctamente"
- [ ] Network Tab muestra request POST a `/api/Vehiculos`
- [ ] Request incluye header `X-XSRF-TOKEN`
- [ ] Response Status es `201 Created`
- [ ] Response body contiene el vehículo creado
- [ ] Alert verde aparece en el modal
- [ ] Modal se cierra después de 1.5 segundos
- [ ] Evento `vehiculoCreado` se emite
- [ ] Formulario se resetea correctamente

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema: "❌ CSRF Token NO encontrado"
**Causa**: El token no se obtiene después del login
**Solución**:
1. Verificar que después del login se llama `obtenerCsrfToken()`
2. Revisar que el endpoint `/api/auth/csrf-token` funciona
3. En el backend, verificar que el middleware no está bloqueando

### Problema: "Error de conexión: No se pudo contactar al servidor"
**Causa**: El backend no está corriendo o hay problemas de CORS
**Solución**:
1. Verificar que el backend está corriendo en `http://192.168.10.5:5176`
2. Revisar CORS en `Program.cs`
3. Verificar que no hay firewall bloqueando

### Problema: "Error 400 - Datos inválidos"
**Causa**: El DTO no coincide con lo esperado por el backend
**Solución**:
1. Verificar que todos los campos requeridos están presentes
2. Revisar que los tipos de datos son correctos (string, number, boolean)
3. En el backend, revisar `VehiculoCreateDto` vs los campos enviados

### Problema: "Modal no se cierra"
**Causa**: El evento `vehiculoCreado` no se emite correctamente
**Solución**:
1. Verificar que el componente padre escucha `(vehiculoCreado)="onVehiculoCreado()"`
2. Revisar que el método `cerrar()` se llama correctamente
3. En console, verificar que se ve: "🎉 Vehículo creado con ID: ..."

---

## 📊 FLUJO DE CREACIÓN

```
Usuario Llena Formulario
         ↓
Usuario Hace Clic "Crear Vehículo"
         ↓
Component Valida Datos (6 validaciones)
         ↓
Falla Validación? → Mostrar Error y RETORNAR
         ↓
Obtener Token CSRF (/api/auth/csrf-token)
         ↓
Enviar POST (/api/Vehiculos) con Token
         ↓
Backend Valida CSRF
         ↓
Éxito 201? → Mostrar Éxito
         ↓
Resetear Formulario
         ↓
Emitir Evento vehiculoCreado
         ↓
Cerrar Modal (1.5s)
```

---

## 🔧 COMANDO PARA PROBAR DESDE POWERSHELL

Si quieres probar directamente sin UI:

```powershell
# 1. Obtener CSRF token
$csrfResponse = Invoke-WebRequest `
  -Uri "http://192.168.10.5:5176/api/auth/csrf-token" `
  -Method GET `
  -UseBasicParsing

$csrfToken = ($csrfResponse.Content | ConvertFrom-Json).csrfToken
Write-Host "Token CSRF: $csrfToken"

# 2. Crear vehículo
$body = @{
    nombreVehiculo = "Test Vehicle"
    tipoVehiculo = "Sedán"
    transmision = "Automática"
    esDeEmpresa = $true
    placas = "TEST-001"
    kilometraje = 0
    activo = $true
    observaciones = "Prueba desde PowerShell"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "http://192.168.10.5:5176/api/Vehiculos" `
  -Method POST `
  -Headers @{"X-XSRF-TOKEN" = "$csrfToken"} `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing

Write-Host "Response: $($response.Content)"
```

---

**¡Listo para testear!** 🎉
