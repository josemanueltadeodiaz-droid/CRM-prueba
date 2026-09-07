import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { SecureAuthService } from '../services/secure-auth.service';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class SecureAuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: SecureAuthService,
    private cookieService: CookieService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Asegurar que todas las requests incluyan credentials para cookies HttpOnly
    const headers: any = {
      'X-Requested-With': 'XMLHttpRequest' // CSRF protection
    };

    // 🔥 CRÍTICO: SOLO agregar Content-Type si NO es FormData
    // Angular maneja automáticamente el Content-Type con boundary para FormData
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // 🆕 Fallback: Injectar Authorization Header si existe cookie manual
    // Esto asegura que el backend reciba el token aunque fallen las HttpOnly cookies
    const authToken = this.authService.getToken(); // Necesitamos exponer esto en el servicio o usar cookieService directamente aquí
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Para métodos que modifican datos, incluir el token CSRF desde el servicio
    if (this.requiresCsrfToken(req.method)) {
      // PRIMERO: Intentar obtener del servicio
      let csrfToken = this.authService.getCsrfToken();
      
      // FALLBACK: Si no está en el servicio, leer de la cookie XSRF-TOKEN
      if (!csrfToken && this.cookieService.check('XSRF-TOKEN')) {
        csrfToken = this.cookieService.get('XSRF-TOKEN');
        console.log('📖 CSRF Token obtenido de cookie XSRF-TOKEN');
      }
      
      if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
        console.log(`🔒 CSRF Token incluido para ${req.method} ${req.url}`, csrfToken.substring(0, 20) + '...');
      } else {
        console.warn(`⚠️ CSRF Token NO encontrado (ni en servicio ni en cookies) para ${req.method} ${req.url}`);
        console.warn('Asegúrate de llamar obtenerCsrfToken() después del login');
      }
    }


    let secureReq = req.clone({
      setHeaders: headers,
      withCredentials: true // CRÍTICO: para cookies HttpOnly
    });

    return next.handle(secureReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Error 415: Unsupported Media Type
        if (error.status === 415) {
          console.error('❌ Error 415 - Unsupported Media Type');
          console.error('URL:', req.url);
          console.error('Método:', req.method);
          console.error('Body type:', req.body?.constructor.name);
          console.error('Verifica que el servidor acepte el Content-Type enviado');
        }

        // Si es error 401 y no es login/refresh, intentar refresh automático
        if (error.status === 401 && !this.isAuthRoute(req.url)) {
          return this.handle401Error(secureReq, next);
        }

        // Si es error 403, verificar CSRF
        if (error.status === 403) {
          console.warn('⚠️ Error 403 - Posible problema con CSRF o permisos insuficientes');
          console.warn('CSRF Token en servicio:', this.authService.getCsrfToken() ? 'SÍ' : 'NO');
          console.warn('CSRF Token en cookie:', this.cookieService.check('XSRF-TOKEN') ? 'SÍ' : 'NO');
          console.warn('Verifica que el token CSRF esté configurado correctamente');
        }

        return throwError(() => error);
      })
    );
  }

  private requiresCsrfToken(method: string): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap(() => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);

          // Rebuild request with fresh token so any stale Authorization header is replaced
          const freshToken = this.authService.getToken();
          const retryHeaders: any = { 'X-Requested-With': 'XMLHttpRequest' };
          if (!(request.body instanceof FormData)) {
            retryHeaders['Content-Type'] = 'application/json';
          }
          if (freshToken) {
            retryHeaders['Authorization'] = 'Bearer ' + freshToken;
          }
          const retryReq = request.clone({
            setHeaders: retryHeaders,
            withCredentials: true
          });
          return next.handle(retryReq);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          
          // Si falla el refresh, forzar logout inmediato
          this.authService.forceLogout();
          return throwError(() => err);
        })
      );
    } else {
      // Si ya está refrescando, esperar a que termine
      return this.refreshTokenSubject.pipe(
        filter(result => result !== null),
        take(1),
        switchMap(() => next.handle(request))
      );
    }
  }

  private isAuthRoute(url: string): boolean {
    const u = url.toLowerCase();
    return u.includes('/api/auth/login') || 
           u.includes('/api/auth/refresh') || 
           u.includes('/api/auth/register') ||
           u.includes('/api/auth/registro') ||
           u.includes('/api/auth/logout');
  }
}