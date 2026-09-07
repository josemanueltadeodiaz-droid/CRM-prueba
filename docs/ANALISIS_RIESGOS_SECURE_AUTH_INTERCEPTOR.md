# 🔐 ANÁLISIS DE RIESGOS: SecureAuthInterceptor para Windows Server

## 📋 Resumen Ejecutivo
**Riesgo General: ALTO** - Hay problemas críticos relacionados con CORS, manejo de tokens CSRF, y logging que pueden causar fallos en producción en Windows Server.

---

## 🚨 RIESGOS CRÍTICOS (Deben corregirse ANTES del despliegue)

### 1. **CORS y withCredentials Incompatible (Windows Server IIS)**
**Severidad:** CRÍTICA
**Ubicación:** Línea 46 (`withCredentials: true`)

```typescript
let secureReq = req.clone({
  setHeaders: headers,
  withCredentials: true // ⚠️ PROBLEMA
});
```

**Problema en Windows Server:**
- Windows Server con IIS requiere configuración específica de CORS
- Si el backend NO envía `Access-Control-Allow-Credentials: true`, las requests fallarán
- En Windows Server, las políticas de CORS son más restrictivas que en Linux

**Síntomas:**
```
CORS policy: The value of the 'Access-Control-Allow-Credentials' header 
in the response is '' which must be 'true' when the request's credentials mode (include) is 'include'.
```

**Solución:**
```csharp
// En Program.cs del backend (.NET Core en Windows Server)
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("https://tu-dominio.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials() // 🔑 CRÍTICO
              .WithExposedHeaders("X-XSRF-TOKEN");
    });
});
```

---

### 2. **CSRF Token Management Sin Validación**
**Severidad:** CRÍTICA
**Ubicación:** Línea 28-35

```typescript
if (this.requiresCsrfToken(req.method)) {
  const csrfToken = this.authService.getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
    // ⚠️ Solo aviso en consola si falla
  } else {
    console.warn(`⚠️ CSRF Token NO encontrado...`);
  }
}
```

**Problemas:**
- Si no hay token CSRF, la request se envía SIN protección
- No hay rechazo explícito de la request
- En Windows Server, IIS puede rechazar automáticamente requests sin CSRF token correcto
- Los avisos en consola NO previenen el error

**Impacto en Windows Server:**
- IIS con Asp.NET Core anti-CSRF habilitado rechazará estas requests con error 400

**Solución Recomendada:**
```typescript
if (this.requiresCsrfToken(req.method)) {
  const csrfToken = this.authService.getCsrfToken();
  
  if (!csrfToken) {
    // 🛑 Rechazar explícitamente
    const error = new HttpErrorResponse({
      error: 'CSRF token not available',
      status: 403,
      statusText: 'Forbidden'
    });
    return throwError(() => error);
  }
  
  headers['X-XSRF-TOKEN'] = csrfToken;
}
```

---

### 3. **Logging en Producción Expone Información Sensible**
**Severidad:** CRÍTICA (Seguridad)
**Ubicación:** Líneas 33, 50-54, 68-69

```typescript
console.log(`🔒 CSRF Token incluido...`, csrfToken.substring(0, 20) + '...');
console.error('❌ Error 415 - Unsupported Media Type');
console.error('URL:', req.url);
console.error('Body type:', req.body?.constructor.name);
console.warn('⚠️ Error 403...');
```

**Problemas en Windows Server:**
- Los logs se escriben en la consola del navegador (visible en DevTools)
- Expone tokens CSRF parciales
- URLs y body types pueden revelar estructura del API
- En Windows Server con HTTPS, esto es una vulnerabilidad de exposición de datos

**Impacto:**
- Desarrolladores maliciosos pueden ver estructura de requests
- Tokens CSRF expuestos parcialmente
- Información sensible visible en el cliente

**Solución:**
```typescript
// Environment-aware logging
if (!environment.production) {
  console.log(`🔒 CSRF Token incluido para ${req.method}`);
} else {
  // En producción, usar un servicio de logging backend
  this.loggingService.logSecurityEvent('csrf_token_attached', 'INFO');
}
```

---

### 4. **Race Condition en Refresh Token (BehaviorSubject)**
**Severidad:** ALTA
**Ubicación:** Línea 10 y método `handle401Error`

```typescript
private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

// En handle401Error:
this.refreshTokenSubject.next(null);
// ... después
this.refreshTokenSubject.next(true);
```

**Problema:**
- Si múltiples requests fallan con 401 simultáneamente en Windows Server
- El BehaviorSubject puede no sincronizarse correctamente
- Las requests en espera pueden no reintentarse en el orden correcto

**Impacto en Windows Server:**
- Bajo alta carga (muchos usuarios simultáneos en Intranet/Corporativo), esto causa fallos de autenticación
- El token de refresh se solicita múltiples veces innecesariamente

**Solución:**
```typescript
private refreshTokenSubject = new ReplaySubject<boolean>(1);
private isRefreshing = false;

private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  if (!this.isRefreshing) {
    this.isRefreshing = true;
    
    return this.authService.refreshToken().pipe(
      tap(() => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(true);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.authService.forceLogout();
        return throwError(() => err);
      })
    );
  } else {
    return this.refreshTokenSubject.pipe(
      filter(result => result === true),
      take(1),
      switchMap(() => next.handle(request))
    );
  }
}
```

---

## ⚠️ RIESGOS ALTOS (Deben monitorearse)

### 5. **Falta de Timeout en Refresh Token**
**Severidad:** ALTA
**Problema:**
```typescript
return this.authService.refreshToken().pipe(
  switchMap(() => {
    // ⚠️ Sin timeout - puede esperar indefinidamente
    return next.handle(request);
  })
);
```

**Impacto:**
- Si el servidor de Windows Server está lento o no responde
- El navegador espera indefinidamente
- Acumula requests pendientes en memoria

**Solución:**
```typescript
import { timeout } from 'rxjs/operators';

return this.authService.refreshToken().pipe(
  timeout(30000), // 30 segundos máximo
  switchMap(() => next.handle(request)),
  catchError((err) => {
    if (err.name === 'TimeoutError') {
      this.authService.forceLogout();
      return throwError(() => new Error('Refresh token timeout'));
    }
    return throwError(() => err);
  })
);
```

---

### 6. **Configuración de FormData Problemática en Windows Server**
**Severidad:** ALTA
**Ubicación:** Línea 22-24

```typescript
if (!(req.body instanceof FormData)) {
  headers['Content-Type'] = 'application/json';
}
```

**Problema:**
- No hay validación de que el body sea válido JSON
- En Windows Server con ciertos navegadores, FormData puede no funcionar como se espera
- Falta el header `Content-Length` que IIS puede requerir

**Solución:**
```typescript
if (req.body instanceof FormData) {
  // Dejar que Angular maneje Content-Type automáticamente
  // No establecer Content-Length aquí
} else if (req.body) {
  headers['Content-Type'] = 'application/json';
  // Considerar agregar Content-Length para IIS
  if (typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    headers['Content-Length'] = bodyString.length.toString();
  }
} else {
  headers['Content-Type'] = 'application/json';
}
```

---

### 7. **URL Matching Case-Insensitive Sin Protección Adicional**
**Severidad:** MEDIA
**Ubicación:** Método `isAuthRoute` (línea 113-119)

```typescript
private isAuthRoute(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('/api/auth/login') || ...
}
```

**Problema:**
- Solo revisa `includes()`, no una coincidencia exacta
- Una URL como `/api/auth/login/malicious` se detectaría como auth route
- En Windows Server, los paths pueden comportarse diferente según la configuración

**Solución:**
```typescript
private isAuthRoute(url: string): boolean {
  const u = url.toLowerCase();
  const authPaths = [
    /\/api\/auth\/login(\?|$)/i,
    /\/api\/auth\/refresh(\?|$)/i,
    /\/api\/auth\/register(\?|$)/i,
    /\/api\/auth\/logout(\?|$)/i
  ];
  return authPaths.some(pattern => pattern.test(u));
}
```

---

## 📊 RIESGOS MEDIOS (Revisar en staging)

### 8. **Manejo de Errores 415 Insuficiente**
**Severidad:** MEDIA
**Ubicación:** Línea 50-55

```typescript
if (error.status === 415) {
  console.error('Error 415...');
  // ⚠️ Solo logguea, no hace nada más
  return throwError(() => error);
}
```

**Problema:**
- En Windows Server con IIS, errores 415 son comunes con configuraciones MIME incorrectas
- No intenta reintentos automáticos
- El usuario ve error sin contexto

**Solución:**
```typescript
if (error.status === 415) {
  this.logger.error('Content-Type mismatch', { 
    url: req.url,
    contentType: req.headers.get('Content-Type')
  });
  
  // Reintentar con Content-Type genérico
  const retryReq = req.clone({
    setHeaders: { 'Content-Type': 'application/json' }
  });
  return next.handle(retryReq);
}
```

---

### 9. **Falta de Headers de Seguridad Importantes**
**Severidad:** MEDIA
**Problema:**
No se implementan headers modernos de seguridad:

```typescript
// Faltan estos headers en producción Windows Server
headers['X-Content-Type-Options'] = 'nosniff';
headers['X-Frame-Options'] = 'DENY';
headers['X-XSS-Protection'] = '1; mode=block';
headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
```

---

### 10. **No hay Validación de Origin en CORS**
**Severidad:** MEDIA
**Problema:**
```typescript
withCredentials: true
```
Sin validación de Origin en el backend, cualquier sitio puede enviar requests

---

## ✅ CHECKLIST PRE-DESPLIEGUE WINDOWS SERVER

```
✅ Verificar CORS en backend (Access-Control-Allow-Credentials)
✅ Reemplazar console.log con logger backend en producción
✅ Implementar validación obligatoria de CSRF token
✅ Cambiar BehaviorSubject a ReplaySubject
✅ Agregar timeout a refreshToken()
✅ Revisar configuración MIME en IIS
✅ Agregar headers de seguridad HTTP
✅ Mejorar validación de isAuthRoute con regex
✅ Configurar HTTPS en Windows Server (obligatorio)
✅ Testear con múltiples usuarios simultáneos
```

---

## 🔧 RECOMENDACIONES INMEDIATAS

### 1. Crear una versión de producción del interceptor
```typescript
// secure-auth.interceptor.prod.ts
@Injectable()
export class SecureAuthInterceptorProd implements HttpInterceptor {
  // Versión optimizada sin logs
  // Con validaciones más estrictas
  // Con timeouts configurados
}
```

### 2. Configurar en app.config.ts
```typescript
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: environment.production 
        ? SecureAuthInterceptorProd 
        : SecureAuthInterceptor,
      multi: true
    }
  ]
};
```

### 3. Validar en Program.cs (.NET Backend)
```csharp
// Validación anti-CSRF para Windows Server
services.AddAntiforgery(options => {
    options.HeaderName = "X-XSRF-TOKEN";
    options.FormFieldName = "__RequestVerificationToken";
    options.SuppressXFrameOptionsHeader = false; // ✅ IIS compatible
});
```

---

## 📝 Conclusión

**Estado Actual:** NO LISTO para producción en Windows Server

**Acciones Requeridas Antes del Despliegue:**
1. Corregir configuración CORS en backend
2. Reemplazar logging sensible
3. Implementar validación obligatoria de CSRF
4. Mejorar manejo de race conditions
5. Agregar timeouts
6. Testing completo con IIS

**Tiempo Estimado:** 4-6 horas de desarrollo + 2 horas de testing
