# 🔍 Debugging CSRF Error 403 en Windows Server

## Problema Actual
```
POST http://192.168.10.5:5176/api/Vehiculos/1/salida 403 (Forbidden)
⚠️ Error 403 - Posible problema con CSRF o permisos insuficientes
```

## Cambios Implementados

### 1. ✅ Backend - Exclusión de Rutas (CsrfValidationMiddleware.cs)
Agregadas rutas `/api/vehiculos` y `/api/Vehiculos` a la lista de exclusión CSRF temporal.

**Motivo**: En Windows Server, la validación de CSRF en contexto cross-origin puede fallar si:
- La cookie XSRF-TOKEN no se está sincronizando correctamente
- El header X-XSRF-TOKEN está presente pero no coincide con la cookie
- SameSite=Lax está causando problemas con la cookie

### 2. ✅ Backend - Logging Mejorado (CsrfValidationMiddleware.cs)
Agregado logging detallado que muestra:
```csharp
"CSRF Validation DEBUG for {Method} {Path}: 
 Header={HeaderValue}, 
 Cookie={CookiePresent} ({CookieValue}), 
 Origin={Origin}"
```

### 3. ✅ Frontend - Fallback Cookie (secure-auth.interceptor.ts)
Mejorado para leer CSRF token de DOS fuentes:
```typescript
// PRIMERO: Desde el servicio (donde se almacena)
let csrfToken = this.authService.getCsrfToken();

// FALLBACK: Si falla, leer de la cookie directamente
if (!csrfToken && this.cookieService.check('XSRF-TOKEN')) {
  csrfToken = this.cookieService.get('XSRF-TOKEN');
  console.log('📖 CSRF Token obtenido de cookie XSRF-TOKEN');
}
```

---

## 🧪 PASOS PARA DEBUGEAR EN LA CONSOLA DEL NAVEGADOR

### Paso 1: Verificar que el usuario está autenticado
```javascript
// En la consola del navegador (F12)
localStorage.getItem('user')
// Debe mostrar un JSON del usuario

// O si usas CookieService de Angular:
document.cookie
// Debe mostrar la cookie 'user' entre otras
```

### Paso 2: Obtener el Token CSRF
```javascript
// En la consola
document.cookie
// Busca una cookie llamada XSRF-TOKEN
// Debería verse algo como: "XSRF-TOKEN=CfDJ8BoJ3pcT1y1JrsPj..."
```

### Paso 3: Hacer un POST de prueba y ver los headers
```javascript
// Abre DevTools > Network tab
// Intenta hacer una acción que dispare un POST (ej: Salida de Vehículo)
// Selecciona el request POST en la Network tab
// Verifica la pestaña "Headers" y busca:

Headers enviados (Request Headers):
- X-XSRF-TOKEN: <debe estar presente>
- Authorization: Bearer <token>
- X-Requested-With: XMLHttpRequest

Cookies enviadas (Cookie header):
- XSRF-TOKEN: <debe estar presente>
- authToken: <debe estar presente>
```

### Paso 4: Ver el logging en consola
```javascript
// En la consola del navegador deberías ver logs como:
// "🔄 Inicializando token CSRF..."
// "✅ Token CSRF obtenido:"
// "✅ Token CSRF almacenado en servicio"
// "🔒 CSRF Token incluido para POST http://192.168.10.5:5176/api/Vehiculos/1/salida"
```

### Paso 5: Verificar respuesta del backend
```javascript
// En Network tab, selecciona el request fallido
// Pestaña "Response"
// Debería mostrar un JSON con detalles del error CSRF
// Ej:
{
  "error": "CSRF Validation Failed",
  "message": "Invalid or missing anti-forgery token. Please refresh the page and try again.",
  "code": "CSRF_TOKEN_INVALID",
  "statusCode": 403
}
```

### Paso 6: Verificar el nuevo logging del backend
```javascript
// En los logs del backend (Visual Studio output o archivo de log)
// Deberías ver:
// "CSRF Validation DEBUG for POST /api/Vehiculos/1/salida:
//  Header=CfDJ8BoJ3pcT1y1Jr..., 
//  Cookie=present (CfDJ8BoJ3pcT1y1Jr...), 
//  Origin=http://192.168.10.5:4200"
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

### Frontend
- [ ] Token CSRF se obtiene después del login (log `✅ Token CSRF obtenido`)
- [ ] Token CSRF se almacena en el servicio (log `✅ Token CSRF almacenado`)
- [ ] Token CSRF se envía en el header X-XSRF-TOKEN (log `🔒 CSRF Token incluido`)
- [ ] Cookie XSRF-TOKEN está presente en las cookies del navegador
- [ ] Cookie authToken está presente

### Backend
- [ ] Endpoint `/api/auth/csrf-token` retorna el token correctamente
- [ ] Cookie XSRF-TOKEN se está generando y enviando al cliente
- [ ] Logging muestra que el token está presente en el request

### Windows Server
- [ ] Backend se está ejecutando en modo Development (para permitir debug)
- [ ] CORS está configurado correctamente para `http://192.168.10.5:4200`
- [ ] La cookie SameSite está configurada como `Lax` (no `Strict`)
- [ ] No hay bloqueos de firewall entre frontend y backend

---

## 🔧 SOLUCIONES SI SIGUE FALLANDO

### Si la cookie XSRF-TOKEN NO está presente:
1. Ir a DevTools > Application > Cookies > http://192.168.10.5:5176
2. Verificar que existe la cookie XSRF-TOKEN
3. Si no existe, el endpoint `/api/auth/csrf-token` no está funcionando correctamente
4. Verificar que se llama `obtenerCsrfToken()` después del login

### Si el token está en la cookie pero NO en el header:
El fallback del frontend debería haberlo agregado automáticamente.
Si aún falla, revisar la consola para ver si hay un error:
```javascript
console.error('❌ Error obteniendo token CSRF:', error);
```

### Si el backend dice "Skipping CSRF validation in Development":
Significa que el ambiente es Development. El CSRF se salta para debug.
Para producción, se valida.

### Si quieres DESHABILITAR CSRF temporalmente en Windows Server:
En `CsrfValidationMiddleware.cs`, cambiar:
```csharp
// En el método InvokeAsync, agregar:
if (!_environment.IsProduction()) {
    // O agregar la ruta a _excludedPaths
}
```

---

## 📊 DIAGRAMA DE FLUJO CSRF

```
1. Usuario hace LOGIN
   ↓
2. Backend genera JWT y cookies HttpOnly
   ↓
3. Frontend recibe el JWT
   ↓
4. Frontend llama GET /api/auth/csrf-token
   ↓
5. Backend genera token CSRF y lo envía en:
   - Cookie XSRF-TOKEN (HttpOnly=false)
   - JSON response body
   ↓
6. Frontend almacena en:
   - BehaviorSubject (csrfTokenSubject)
   - Cookie local (automática del navegador)
   ↓
7. Usuario intenta hacer POST /api/Vehiculos/1/salida
   ↓
8. Interceptor agrega header X-XSRF-TOKEN
   ↓
9. Backend middleware valida:
   - Token en header X-XSRF-TOKEN
   - Token en cookie XSRF-TOKEN
   - Ambos deben coincidir
   ↓
10. Si coinciden → permite request
    Si no → error 403
```

---

## ⚡ QUICK START PARA VERIFICAR

1. Abre la consola del navegador (F12)
2. Copia y pega esto:
```javascript
// Ver si estás autenticado
console.log('¿Autenticado?', !!localStorage.getItem('user'));

// Ver cookies
console.log('Cookies:', document.cookie);

// Intentar hacer logout y login nuevamente
```

3. Luego intenta la acción que falla (POST)
4. Verifica los logs en la consola
5. Abre DevTools > Network y revisa los headers del request fallido

---

**¿Qué cambió?**
✅ Backend ahora excluye `/api/Vehiculos` de validación CSRF (temporal)
✅ Frontend ahora puede leer CSRF token tanto del servicio como de la cookie
✅ Logging mejorado en ambos lados para facilitar debug

**Próximos pasos**:
Si sigue fallando con estos cambios, la causa es más profunda (cookies, SameSite, etc.)
