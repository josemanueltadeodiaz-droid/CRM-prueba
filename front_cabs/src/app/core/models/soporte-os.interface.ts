import { TipoSoftware } from '../enums/tipo-software.enum';
export interface OrdenServicio {
  // ===== Datos Principales =====
  clienteId: number;
  agenteId: number;
  // ===== Fechas =====
  fecha: string;
  fechaEntrega: string;
  // ===== Documentos =====
  documentoOrigenId: number;
  afectado: number;
  cancelado: number;
  impreso: number;
  neto: number;
  impuesto: number;
  impuesto1: number;
  estado: number;
  observacionesDocumento: string;
  observacionesFinales: string;
  total: number;
  documentoId: number;
  participantes: number;
  esVirtual: boolean;
  horas: number;
  infDispositivo: string;
  piezas: string;
  ubicacion: string;
  agentesIds: number[];
  softwareControlRemoto: TipoSoftware;
}
