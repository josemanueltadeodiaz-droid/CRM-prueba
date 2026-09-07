import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  SecureAuthService,
  User,
} from '../../../../src/app/core/services/secure-auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UiIconComponent } from '../../shared/~exports/detail-view.index';
import { LayoutService } from '../../core/services/layout.service';

type IconType =
  | 'resumen'
  | 'calendario'
  | 'conpaqi'
  | 'usuarios'
  | 'configuracion'
  | 'ayuda'
  | 'reparaciones'
  | 'ordenes'
  | 'cotizaciones'
  | 'cog-8-tooth'
  | 'ordenesServicio';

interface NavItem {
  id: string; // Identificador único
  label: string;
  icon: IconType;
  link?: string;
  notify?: boolean;
  roles?: string[]; // Roles que tienen acceso
  children?: NavItem[]; // Submenu items
  expanded?: boolean; // Estado de expansión del submenu
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, UiIconComponent],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar implements OnInit {
  @Input() activeLabel: string | null = null;

  isCollapsed = false;
  mostrarBandejaPerfil = false;

  user$!: Observable<User | null>;
  currentUserRole$!: Observable<string | null>;

  // Primer Nav - Resumen y Calendario
  private readonly firstNavItems: NavItem[] = [
    {
      id: 'resumen',
      label: 'Resumen',
      icon: 'resumen',
      link: '/administracion/resumen',
      roles: ['ADMINISTRACION', 'RECEPCION', ],
    },
    {
      id: 'calendario',
      label: 'Calendario',
      icon: 'calendario',
      link: '/modulesShared/calendario',
      roles: ['ADMINISTRACION', 'RECEPCION', ],
    },
    {
      id: 'ordenesServicio',
      label: 'Mis Ordenes de Servicio ',
      icon: 'ordenesServicio',
      link: '/soporte/misOrdenesServicio',
      roles: ['SOPORTE',],
    },
    {
      id: 'recepcionOrdenesServicio',
      label: 'Ordenes de Servicio',
      icon: 'ordenesServicio',
      link: '/recepcion/menuOrden',
      roles: [ 'ADMINISTRACION', 'RECEPCION',],
    }        
  ];

  // Segundo Nav - CONTPAQi
  private readonly secondNavItems: NavItem[] = [
    {
      id: 'conpaqi',
      label: 'Comercial',
      icon: 'conpaqi',
      roles: ['ADMINISTRACION','RECEPCION','SOPORTE'],
      children: [
        {
          id: 'catalogos-base',
          label: 'Catálogos Base',
          icon: 'ordenes',
          link: '/legacy/catalogos-base',
          roles: ['ADMINISTRACION','RECEPCION'],
        },
        {
          id: 'cotizaciones',
          label: 'Cotizaciones',
          icon: 'reparaciones',
          link: '/legacy/operaciones/documentos',
          roles: ['RECEPCION', 'ADMINISTRACION','SOPORTE'],
        },
        {
          id: 'reportes',
          label: 'Métricas',
          icon: 'reparaciones',
          link: '/legacy/metricas',
          roles: ['RECEPCION', 'ADMINISTRACION'],
        },
      ],
    }
  ];


  // CUARTO NAV - Sistema (Configuración y Ayuda)
  private readonly fourthNavItems: NavItem[] = [
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: 'configuracion',
      link: '/administracion/configuracion',
      roles: ['ADMINISTRACION'],
    },
    {
      id: 'ayuda',
      label: 'Ayuda',
      icon: 'ayuda',
      link: '/modulesShared/ayuda',
      roles: ['ADMINISTRACION', 'RECEPCION', 'SOPORTE'],
    }
  ];

  mainNav: NavItem[] = [];
  secondaryNav: NavItem[] = [];

  constructor(
    private authService: SecureAuthService,
    private router: Router,
    public layoutService: LayoutService
  ) {
    this.user$ = this.authService.currentUser$ as Observable<User | null>;
    this.currentUserRole$ = this.user$.pipe(map((user) => user?.role || null));
  }

  ngOnInit(): void {
    // Filtrar navegación según el rol del usuario
    this.currentUserRole$.subscribe((role) => {
      if (role) {
        // Combinar los tres navs en orden
        const allNavItems = [
          ...this.firstNavItems,
          ...this.secondNavItems,
          ...this.fourthNavItems
        ];
        this.mainNav = this.filterNavByRole(allNavItems, role);
      }
    });
  }

  /**
   * Filtra los items de navegación según el rol del usuario
   * Preserva el estado de expansión de los submenús
   */
  private filterNavByRole(items: NavItem[], userRole: string): NavItem[] {
    return items
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => {
        const filteredChildren = item.children
          ? this.filterNavByRole(item.children, userRole)
          : undefined;

        return {
          ...item,
          children: filteredChildren,
          // Mantener el estado expanded si ya existe, sino inicializar en false
          expanded: item.expanded ?? false,
        };
      });
  }

  /**
   * Toggle submenu expansion
   */
  toggleSubmenu(item: NavItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (item.children && item.children.length > 0) {
      item.expanded = !item.expanded;
    }
  }

  /**
   * Verifica si un item tiene hijos
   */
  hasChildren(item: NavItem): boolean {
    return !!(item.children && item.children.length > 0);
  }

  /**
   * Verifica si la ruta actual coincide con el link
   */
  isActive(link?: string): boolean {
    if (!link) return false;
    return this.router.url === link;
  }

  /**
   * Verifica si algún hijo está activo
   */
  hasActiveChild(item: NavItem): boolean {
    if (!item.children || item.children.length === 0) return false;
    
    // Verificar si algún hijo está activo
    return item.children.some((child) => {
      if (child.link) {
        // Comparar la URL actual con el link del hijo
        const currentUrl = this.router.url;
        return currentUrl === child.link || currentUrl.startsWith(child.link + '/');
      }
      return false;
    });
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}