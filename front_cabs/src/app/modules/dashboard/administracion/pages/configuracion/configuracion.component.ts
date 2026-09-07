// =====================================================================================
// COMPONENTE CONFIGURACIÓN ADMINISTRACIÓN - configuracion.component.ts
// =====================================================================================
// Dashboard de configuración exclusivo para rol ADMINISTRADOR
// Hub central para acceder a diferentes configuraciones del sistema
// =====================================================================================

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiHeaderComponent } from '../../../../../shared/molecules/header/header.component';

interface ConfiguracionItem {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo';
  badge?: string;
  habilitado: boolean;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, UiHeaderComponent],
  template: `
    <div class="min-h-screen flex flex-col gap-8">
      <!-- Header -->
      <app-ui-header
        titulo="Configuración del Sistema"
        descripcion="Panel de administración y ajustes del sistema"
        [visualizarButton]="false"
        ></app-ui-header>

      <!-- Grid de Configuraciones -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        @for (item of configuraciones; track item.id) {
          <div 
            [class]="getCardClasses(item)"
            (click)="item.habilitado ? navegarA(item.ruta) : null">
            
            <!-- Icono y Badge -->
            <div class="flex items-center justify-between mb-4">
              <div [class]="getIconContainerClasses(item)">
                <span class="text-2xl">{{ item.icono }}</span>
              </div>
              @if (item.badge) {
                <span [class]="getBadgeClasses(item)">
                  {{ item.badge }}
                </span>
              }
              @if (!item.habilitado) {
                <span class="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  Próximamente
                </span>
              }
            </div>

            <!-- Contenido -->
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ item.titulo }}</h3>
            <p class="text-sm text-gray-500 ">{{ item.descripcion }}</p>

            <!-- Footer -->
            <div [class]="getFooterClasses(item)">
              @if (item.habilitado) {
                Configurar
                <svg class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              } @else {
                No disponible
              }
            </div>
          </div>
        }
      </div>

      <!-- Información Adicional -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">Acerca de la Configuración</h3>
            <p class="text-sm text-gray-600 mb-3">
              Este panel permite a los administradores gestionar diferentes aspectos del sistema. 
              Las configuraciones disponibles se irán ampliando según las necesidades del negocio.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Rol: Administrador
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Acceso Seguro
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConfiguracionComponent {
  configuraciones: ConfiguracionItem[] = [
    {
      id: 'enlace-agentes',
      titulo: 'Enlace de Agentes',
      descripcion: 'Conecta usuarios del CRM con agentes del sistema Adminpaq para cotizaciones',
      icono: '🔗',
      ruta: '/administracion/enlace-agentes',
      color: 'purple',
      badge: 'Activo',
      habilitado: true
    },
    {
      id: 'usuarios',
      titulo: 'Gestión de Usuarios',
      descripcion: 'Administra usuarios, permisos y accesos al sistema',
      icono: '👥',
      ruta: '/modulesShared/usuarios',
      color: 'blue',
      badge: 'Activo',      
      habilitado: true
    },
    {
      id: 'notificaciones',
      titulo: 'Notificaciones',
      descripcion: 'Configura alertas y notificaciones del sistema',
      icono: '🔔',
      ruta: '/administracion/notificaciones-config',
      color: 'amber',
      habilitado: false
    },
    {
      id: 'integraciones',
      titulo: 'Integraciones',
      descripcion: 'Conecta con servicios externos y APIs',
      icono: '🔌',
      ruta: '/administracion/integraciones',
      color: 'emerald',
      habilitado: false
    },
    {
      id: 'backup',
      titulo: 'Respaldos',
      descripcion: 'Gestiona copias de seguridad del sistema',
      icono: '💾',
      ruta: '/administracion/backup',
      color: 'indigo',
      habilitado: false
    },
    {
      id: 'logs',
      titulo: 'Logs del Sistema',
      descripcion: 'Visualiza registros de actividad y errores',
      icono: '📋',
      ruta: '/administracion/logs',
      color: 'rose',
      habilitado: false
    }
  ];

  constructor(private router: Router) {}

  navegarA(ruta: string): void {
    this.router.navigate([ruta]);
  }

  getCardClasses(item: ConfiguracionItem): string {
    const base = 'bg-white rounded-xl shadow-sm border p-6 transition-all';
    
    if (!item.habilitado) {
      return `${base} border-gray-200 opacity-60 cursor-not-allowed`;
    }

    const hoverColors: Record<string, string> = {
      blue: 'hover:border-blue-300',
      purple: 'hover:border-purple-300',
      emerald: 'hover:border-emerald-300',
      amber: 'hover:border-amber-300',
      rose: 'hover:border-rose-300',
      indigo: 'hover:border-indigo-300'
    };

    return `${base} border-gray-200 cursor-pointer hover:shadow-md ${hoverColors[item.color]} group`;
  }

  getIconContainerClasses(item: ConfiguracionItem): string {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 group-hover:bg-blue-200',
      purple: 'bg-purple-100 group-hover:bg-purple-200',
      emerald: 'bg-emerald-100 group-hover:bg-emerald-200',
      amber: 'bg-amber-100 group-hover:bg-amber-200',
      rose: 'bg-rose-100 group-hover:bg-rose-200',
      indigo: 'bg-indigo-100 group-hover:bg-indigo-200'
    };

    return `w-12 h-12 ${colors[item.color]} rounded-xl flex items-center justify-center transition-colors`;
  }

  getBadgeClasses(item: ConfiguracionItem): string {
    const colors: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-50',
      purple: 'text-purple-600 bg-purple-50',
      emerald: 'text-emerald-600 bg-emerald-50',
      amber: 'text-amber-600 bg-amber-50',
      rose: 'text-rose-600 bg-rose-50',
      indigo: 'text-indigo-600 bg-indigo-50'
    };

    return `text-xs font-medium ${colors[item.color]} px-2 py-1 rounded-full`;
  }

  getFooterClasses(item: ConfiguracionItem): string {
    if (!item.habilitado) {
      return 'mt-4 flex items-center text-gray-400 text-sm font-medium';
    }

    const colors: Record<string, string> = {
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      emerald: 'text-emerald-600',
      amber: 'text-amber-600',
      rose: 'text-rose-600',
      indigo: 'text-indigo-600'
    };

    return `mt-4 flex items-center ${colors[item.color]} text-sm font-medium`;
  }
}
