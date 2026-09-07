// =====================================================================================
// INTERFACES ENLACE AGENTE LEGACY - agente-legacy-enlace.interface.ts
// =====================================================================================
//
// ¿QUÉ HACE ESTE ARCHIVO?
// Interfaces TypeScript para el módulo de enlace entre usuarios CRM y agentes legacy.
// Permite vincular usuarios del sistema con agentes de Adminpaq para cotizaciones.
//
// INTERFACES:
// - AgenteLegacyConEnlace: Agente con información de enlace
// - UsuarioConEnlace: Usuario con su agente enlazado
// - UsuarioSinEnlace: Usuario pendiente de enlazar
// - EnlacesDashboard: Dashboard completo de monitoreo
// - EnlazarAgenteRequest: Request para crear enlace
// - EnlaceAgenteResponse: Response del enlace
//
// =====================================================================================

// ═══════════════════════════════════════════════════════════════
// AGENTE LEGACY CON INFORMACIÓN DE ENLACE
// ═══════════════════════════════════════════════════════════════

/**
 * Agente del sistema legacy con información de enlace a usuario CRM
 */
export interface AgenteLegacyConEnlace {
  /** ID único del agente en el sistema legacy */
  id: number;
  
  /** Código del agente (ej: "VEN001") */
  codigo: string;
  
  /** Nombre completo del agente */
  nombre: string;
  
  /** Tipo de agente (1=Vendedor, 2=Cobrador, 3=Ambos) */
  tipo: number;
  
  /** Descripción del tipo de agente */
  tipoDescripcion: string;
  
  /** Porcentaje de comisión por ventas */
  comisionVenta: number;
  
  /** Porcentaje de comisión por cobros */
  comisionCobro: number;
  
  /** Fecha de alta en el sistema legacy */
  fechaAlta: string;
  
  /** Indica si este agente ya está enlazado a un usuario */
  estaEnlazado: boolean;
  
  /** ID del usuario enlazado (null si no está enlazado) */
  usuarioEnlazadoId: number | null;
  
  /** Nombre del usuario enlazado (null si no está enlazado) */
  usuarioEnlazadoNombre: string | null;
  
  /** Email del usuario enlazado (null si no está enlazado) */
  usuarioEnlazadoEmail: string | null;
  
  /** Fecha del enlace (null si no está enlazado) */
  fechaEnlace: string | null;
}

// ═══════════════════════════════════════════════════════════════
// USUARIOS CON INFORMACIÓN DE ENLACE
// ═══════════════════════════════════════════════════════════════

/**
 * Usuario CRM con información de enlace a agente legacy
 */
export interface UsuarioConEnlace {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: string;
  activo: boolean;
  
  /** Indica si tiene agente legacy enlazado */
  tieneAgenteLegacy: boolean;
  
  /** ID del agente en el sistema legacy */
  idAgenteLegacy: number | null;
  
  /** Código del agente legacy */
  codigoAgenteLegacy: string | null;
  
  /** Nombre del agente legacy */
  nombreAgenteLegacy: string | null;
  
  /** Fecha en que se realizó el enlace */
  fechaEnlaceAgente: string | null;
}

/**
 * Usuario CRM sin enlace a agente legacy
 */
export interface UsuarioSinEnlace {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: string;
  creadoEn: string;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD DE MONITOREO
// ═══════════════════════════════════════════════════════════════

/**
 * Dashboard completo para monitoreo de enlaces
 */
export interface EnlacesDashboard {
  /** Total de usuarios activos en el sistema CRM */
  totalUsuarios: number;
  
  /** Usuarios que tienen agente legacy enlazado */
  usuariosEnlazados: number;
  
  /** Usuarios sin agente legacy enlazado */
  usuariosSinEnlazar: number;
  
  /** Total de agentes en el sistema legacy */
  totalAgentesLegacy: number;
  
  /** Agentes disponibles (sin enlazar a ningún usuario) */
  agentesDisponibles: number;
  
  /** Porcentaje de usuarios enlazados */
  porcentajeEnlazados: number;
  
  /** Usuarios que tienen enlace con agente legacy */
  usuariosConEnlace: UsuarioConEnlace[];
  
  /** Usuarios pendientes de enlazar */
  usuariosPendientes: UsuarioSinEnlace[];
  
  /** Agentes disponibles para enlazar */
  agentesDisponiblesList: AgenteLegacyConEnlace[];
}

// ═══════════════════════════════════════════════════════════════
// REQUEST/RESPONSE PARA OPERACIONES DE ENLACE
// ═══════════════════════════════════════════════════════════════

/**
 * Request para enlazar usuario con agente
 */
export interface EnlazarAgenteRequest {
  usuarioId: number;
  agenteId: number;
}

/**
 * Detalle del enlace realizado
 */
export interface EnlaceDetalle {
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  agenteId: number;
  agenteCodigo: string;
  agenteNombre: string;
  fechaEnlace: string;
}

/**
 * Response de operación de enlace
 */
export interface EnlaceAgenteResponse {
  exitoso: boolean;
  mensaje: string;
  detalle: EnlaceDetalle | null;
}

/**
 * Validación de enlace
 */
export interface ValidacionEnlace {
  esValido: boolean;
  mensaje: string;
  esCambioAgente: boolean;
  agenteAnterior: string | null;
}

/**
 * Verificación de permisos para documentos
 */
export interface PermisoDocumentos {
  puedeCrearDocumentos: boolean;
  idAgenteLegacy: number;
  mensaje: string;
}