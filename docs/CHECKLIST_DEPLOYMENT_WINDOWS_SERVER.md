# ✅ CHECKLIST DE DEPLOYMENT - WINDOWS SERVER

## 📋 PRE-DEPLOYMENT CHECKLIST

### Fase 1: Código Frontend ✅ (1-2 horas)

- [ ] Reemplazar interceptor con versión mejorada
  ```bash
  cp secure-auth.interceptor.windows-server.ts secure-auth.interceptor.ts
  ```

- [ ] Actualizar importación en app.config.ts
  ```typescript
  import { SecureAuthInterceptorWindowsServer } from './core/interceptors/secure-auth.interceptor.windows-server';
  ```

- [ ] Verificar que no hay console.log en componentes críticos
  ```bash
  grep -r "console\." src/app --include="*.ts" | grep -v "node_modules"
  ```

- [ ] Build de producción exitoso
  ```bash
  ng build --configuration production
  ```

- [ ] Verificar tamaño del bundle
  ```bash
  du -sh dist/front_cabs
  # Debe ser < 5MB
  ```

- [ ] Testing en navegador local
  - [ ] Login funciona
  - [ ] CSRF token se obtiene
  - [ ] POST requests incluyen CSRF token
  - [ ] Refresh token funciona
  - [ ] Logout funciona

---

### Fase 2: Código Backend ✅ (1-2 horas)

#### Program.cs

- [ ] CORS configurado correctamente
  ```csharp
  builder.Services.AddCors(options =>
  {
      options.AddPolicy("AllowFrontendWithCredentials", policy =>
      {
          policy
              .WithOrigins("https://tu-dominio.com", "https://www.tu-dominio.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()  // ✅ CRÍTICO
              .WithExposedHeaders("X-XSRF-TOKEN");
      });
  });
  ```

- [ ] Anti-XSRF token configurado
  ```csharp
  builder.Services.AddAntiforgery(options =>
  {
      options.HeaderName = "X-XSRF-TOKEN";
      options.Cookie.HttpOnly = false;
      options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
  });
  ```

- [ ] Orden correcto de middleware
  ```csharp
  app.UseCors("AllowFrontendWithCredentials");  // ANTES de auth
  app.UseHttpsRedirection();
  app.UseAntiforgery();
  app.UseAuthorization();
  ```

- [ ] HTTPS redirection habilitado
  ```csharp
  app.UseHttpsRedirection();
  ```

#### Controllers

- [ ] Endpoints de auth retornan CSRF token
  ```csharp
  [HttpPost("login")]
  [AllowAnonymous]
  public async Task<IActionResult> Login([FromBody] LoginRequest request)
  {
      // ... lógica ...
      var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
      return Ok(new
      {
          // ... datos usuario ...
          csrfToken = tokens.RequestToken
      });
  }
  ```

- [ ] Endpoints de modificación tienen [ValidateAntiforgeryToken]
  ```csharp
  [HttpPost]
  [ValidateAntiforgeryToken]  // ✅ AQUÍ
  public async Task<IActionResult> CreateViatico([FromBody] GastoViaticoCreateRequestDto dto)
  {
      // ...
  }
  ```

#### Database

- [ ] Migraciones aplicadas
  ```bash
  dotnet ef database update
  ```

- [ ] Conexión pooling habilitado
  ```csharp
  builder.Services.AddScoped(sp =>
      new WriteContext(new DbContextOptions<WriteContext>(
          new Dictionary<string, object>
          {
              { "ConnectionStringName", "DefaultConnection" },
              { "MaxPoolSize", 128 }
          }
      ))
  );
  ```

- [ ] Build de producción exitoso
  ```bash
  dotnet build -c Release
  ```

- [ ] Testing de endpoints
  ```bash
  # Test CORS preflight
  curl -X OPTIONS https://localhost:5001/api/GastoViaticos \
    -H "Origin: https://localhost:4200" \
    -v
  
  # Test login con CSRF
  curl -X POST https://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"pass"}' \
    -c cookies.txt
  ```

---

### Fase 3: Infraestructura Windows Server ✅ (2-3 horas)

#### IIS Setup

- [ ] IIS 10.0+ instalado
  ```powershell
  Get-WindowsFeature Web-Server | Select-Object Name, Installed
  ```

- [ ] .NET Hosting Bundle instalado (v6.0+)
  ```powershell
  dotnet --version
  ```

- [ ] Application Pool creado
  - [ ] Nombre: `CABSAppPool`
  - [ ] Runtime: .NET 6.0+
  - [ ] Pipeline Mode: Integrated
  - [ ] Auto Start: Enabled

- [ ] Sitio web creado
  - [ ] Nombre: `CABS-Production`
  - [ ] Binding: `https://tu-dominio.com:443`
  - [ ] SSL Certificate: Válido y no expirado
  - [ ] Application Pool: `CABSAppPool`

- [ ] Permisos NTFS configurados
  ```powershell
  # Dar permisos al Application Pool
  icacls "C:\inetpub\cabs-app" /grant "IIS APPPOOL\CABSAppPool:(OI)(CI)RX"
  icacls "C:\inetpub\cabs-app\logs" /grant "IIS APPPOOL\CABSAppPool:(OI)(CI)M"
  ```

#### SSL Certificate

- [ ] Certificado instalado en IIS
  - [ ] Válido para: `tu-dominio.com`, `www.tu-dominio.com`
  - [ ] No auto-firmado
  - [ ] Cadena de confianza completa
  - [ ] Expira en: > 90 días

- [ ] HTTPS forzado
  ```xml
  <!-- En Web.config -->
  <rewrite>
    <rules>
      <rule name="Redirect to HTTPS" stopProcessing="true">
        <match url="(.*)" />
        <conditions>
          <add input="{HTTPS}" pattern="^OFF$" />
        </conditions>
        <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
      </rule>
    </rules>
  </rewrite>
  ```

#### Web.config

- [ ] Archivo ubicado en raíz de la app
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <configuration>
    <system.webServer>
      <httpProtocol>
        <customHeaders>
          <add name="X-Content-Type-Options" value="nosniff" />
          <add name="X-Frame-Options" value="DENY" />
          <add name="X-XSS-Protection" value="1; mode=block" />
          <add name="Strict-Transport-Security" value="max-age=31536000" />
        </customHeaders>
      </httpProtocol>
      <!-- ... -->
    </system.webServer>
  </configuration>
  ```

- [ ] URL Rewrite configurado para Angular
  ```xml
  <rewrite>
    <rules>
      <rule name="AngularJS Routes" stopProcessing="true">
        <match url=".*" />
        <conditions logicalGrouping="MatchAll">
          <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
        </conditions>
        <action type="Rewrite" url="/" />
      </rule>
    </rules>
  </rewrite>
  ```

#### Logging

- [ ] Carpeta de logs creada
  ```powershell
  New-Item -ItemType Directory -Path "C:\Logs\cabs-app" -Force
  icacls "C:\Logs\cabs-app" /grant "IIS APPPOOL\CABSAppPool:(OI)(CI)M"
  ```

- [ ] appsettings.Production.json configurado
  ```json
  {
    "Logging": {
      "LogLevel": {
        "Default": "Information",
        "Microsoft.AspNetCore": "Warning"
      }
    }
  }
  ```

#### Database Connection

- [ ] Cadena de conexión en ambiente Windows Server
  ```csharp
  "DefaultConnection": "Server=DB-SERVER;Database=CABS_prod;User ID=cabs_user;Password=***;TrustServerCertificate=True;MultipleActiveResultSets=true;"
  ```

- [ ] User de base de datos creado
  ```sql
  CREATE LOGIN cabs_user WITH PASSWORD = '***';
  CREATE USER cabs_user FOR LOGIN cabs_user;
  ALTER ROLE db_owner ADD MEMBER cabs_user;
  ```

- [ ] Connection pooling máximo = 128
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Max Pool Size=128;..."
  }
  ```

---

### Fase 4: Testing Pre-Despliegue ✅ (1-2 horas)

#### Testing Manual

- [ ] CORS Preflight exitoso
  ```bash
  curl -X OPTIONS https://tu-dominio.com/api/GastoViaticos \
    -H "Origin: https://tu-dominio.com" \
    -H "Access-Control-Request-Method: POST" \
    -v
  
  # Debe mostrar:
  # < HTTP/1.1 200 OK
  # < Access-Control-Allow-Credentials: true
  # < Access-Control-Allow-Origin: https://tu-dominio.com
  ```

- [ ] Login y obtener CSRF token
  ```bash
  curl -X POST https://tu-dominio.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"pass"}' \
    -c cookies.txt \
    -v
  
  # Debe retornar csrfToken en response
  ```

- [ ] POST con CSRF token
  ```bash
  CSRF_TOKEN="..."
  curl -X POST https://tu-dominio.com/api/GastoViaticos \
    -H "Content-Type: application/json" \
    -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
    -b cookies.txt \
    -d '{"tieneFactura":true,"montoTotal":500}' \
    -v
  
  # Debe retornar 201 Created, NO 403 Forbidden
  ```

#### Testing Navegador

- [ ] DevTools → Network → Login
  - [ ] Response contiene `csrfToken`
  - [ ] Cookie `XSRF-TOKEN` se recibe
  - [ ] Sin errores CORS

- [ ] DevTools → Network → POST request
  - [ ] Header `X-XSRF-TOKEN` presente
  - [ ] Header `Content-Type: application/json`
  - [ ] Status 201 Created (no 403)

- [ ] DevTools → Console
  - [ ] SIN console.log de tokens
  - [ ] SIN console.error de URLs
  - [ ] SIN avisos CSRF

#### Load Testing

- [ ] Apache Bench o Artillery
  ```bash
  ab -n 1000 -c 50 https://tu-dominio.com/api/health
  
  # Debe completar sin errores
  # Respuesta < 500ms
  ```

- [ ] Simular 10+ usuarios simultáneos
  - [ ] Login simultáneo
  - [ ] POST simultáneo
  - [ ] Sin errores 401/403 aleatorios
  - [ ] Sin race conditions

#### Monitoreo

- [ ] Event Viewer → Windows Logs → Application
  - [ ] SIN errores críticos
  - [ ] SIN warnings de seguridad

- [ ] IIS Logs en `C:\inetpub\logs\LogFiles`
  - [ ] SIN errores 500
  - [ ] SIN errores 403 frecuentes
  - [ ] Response times < 1000ms

- [ ] Application Logs en `C:\Logs\cabs-app`
  - [ ] SIN excepciones
  - [ ] SIN CSRF validation failures

---

### Fase 5: Deployment ✅ (1 hora)

#### Pre-Deployment Final

- [ ] Backup de base de datos
  ```sql
  BACKUP DATABASE CABS_prod 
  TO DISK = 'C:\Backups\CABS_prod_2025-12-29.bak'
  ```

- [ ] Backup de configuración actual
  ```powershell
  Copy-Item -Path "C:\inetpub\cabs-app" -Destination "C:\Backups\cabs-app-backup" -Recurse
  ```

- [ ] Team comunicado
  - [ ] Downtime anunciado: 15 minutos
  - [ ] Rollback plan conocido
  - [ ] Contactos de soporte disponibles

#### Deployment Actual

- [ ] Detener Application Pool
  ```powershell
  Stop-WebAppPool -Name "CABSAppPool"
  ```

- [ ] Copiar archivos build
  ```powershell
  Remove-Item "C:\inetpub\cabs-app\*" -Recurse -Force
  Copy-Item -Path ".\dist\front_cabs\*" -Destination "C:\inetpub\cabs-app" -Recurse
  Copy-Item -Path ".\bin\Release\net6.0\publish\*" -Destination "C:\inetpub\cabs-app\api" -Recurse
  ```

- [ ] Verificar Web.config está presente
  ```powershell
  Test-Path "C:\inetpub\cabs-app\Web.config"
  ```

- [ ] Iniciar Application Pool
  ```powershell
  Start-WebAppPool -Name "CABSAppPool"
  ```

- [ ] Esperar 30 segundos a que se inicie

- [ ] Verificar aplicación está disponible
  ```bash
  curl -I https://tu-dominio.com
  # Debe retornar 200 OK
  ```

- [ ] Ejecutar smoke tests
  - [ ] Acceder a login
  - [ ] Login exitoso
  - [ ] Navegar la app
  - [ ] SIN errores en consola

---

### Fase 6: Post-Deployment ✅ (Contínuo 24h)

#### Primeras 24 Horas

- [ ] Monitoreo cada 1 hora
  - [ ] Event Viewer por errores
  - [ ] IIS Logs por 5xx errors
  - [ ] Application Performance
  - [ ] User feedback

- [ ] Métricas a revisar
  ```
  ✅ Response time: < 500ms
  ✅ Error rate: < 0.1%
  ✅ CPU usage: < 70%
  ✅ Memory: < 80%
  ✅ Disk: > 10% libre
  ```

- [ ] Logs a analizar
  ```bash
  # Ver últimos errores
  Get-EventLog -LogName Application -Newest 100 | 
    Where-Object {$_.EntryType -eq "Error"}
  
  # Ver requests fallidas
  Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\u_ex*.log" | 
    Select-String "403|500" | Tail -20
  ```

#### Si Algo Falla

**Rollback rápido:**
```powershell
# 1. Detener la app
Stop-WebAppPool -Name "CABSAppPool"

# 2. Restaurar backup
Remove-Item "C:\inetpub\cabs-app\*" -Recurse -Force
Copy-Item -Path "C:\Backups\cabs-app-backup\*" -Destination "C:\inetpub\cabs-app" -Recurse

# 3. Reiniciar
Start-WebAppPool -Name "CABSAppPool"

# 4. Verificar
curl -I https://tu-dominio.com
```

---

## 🎯 Criterios de Éxito

```
✅ Login exitoso
✅ CSRF token obtenido y utilizado
✅ POST requests con CSRF token retornan 201
✅ CORS funciona sin errores
✅ Refresh token renueva automáticamente
✅ Logout limpia sesión
✅ SIN console.log de datos sensibles
✅ Response time < 500ms
✅ Error rate < 0.1%
✅ Cero fallos de autenticación bajo carga
```

---

## 📞 Contactos Soporte

- **Administrador IIS:** [nombre/contacto]
- **DBA:** [nombre/contacto]
- **Seguridad:** [nombre/contacto]
- **Team Lead:** [nombre/contacto]

---

## 📊 Estado del Deployment

| Fase | Estado | Responsable | Fecha |
|------|--------|-------------|-------|
| Code Review | ⬜ | [nombre] | |
| Testing | ⬜ | [nombre] | |
| Pre-Deploy | ⬜ | [nombre] | |
| Deployment | ⬜ | [nombre] | |
| Validation | ⬜ | [nombre] | |

---

**Documento Controlado** - Última actualización: 29 de Diciembre, 2025
