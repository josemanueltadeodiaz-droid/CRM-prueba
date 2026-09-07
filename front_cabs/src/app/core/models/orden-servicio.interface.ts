// models/orden-servicio.interface.ts
export interface OrdenServicio {
    idDocumento: number;
    idCliente: number;
    idAgente: number;
    serieDocumento: string;
    folio: number;
    fecha: string;
    razonSocial: string;
    fechaVencimiento: string;
    fechaProntoPago: string;
    fechaEntregaRecepcion: string;
    subtotal: number;
    iva: number;
    total: number;
    estado: string;
    afectado: string;
    impreso: string;
    devuelto: string;
    agente: number;
    observaciones: string;
    facturado: boolean;
    participantes: number;
    esVirtual: boolean;
    horas: number;
    infDispositivo: string;
    piezas: string;
    ubicacion: string;
    softwareControlRemoto: number;
    gasto1: number;
    gasto2: number;
    tipoOrden: number;
    vehiculoId: number;
    agentesIds: number[];
    agentes: string;
    detalles: DetalleOrden[];
}

export interface DetalleOrden {
    idDocumento: number;
    idMovimiento: number;
    observacionesMovimiento: string;
    numeroMovimiento: number;
}

export interface OrdenServicioEnriquecida extends OrdenServicio {
    agentePrincipalNombre: string;
    agentesSecundariosNombres: string;
    agenteNombreCompleto: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    totalItems: number;
    pagina: number;
    resultadosPorPagina: number;
    totalPaginas: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface OrdenesFiltros {
    FechaInicio?: string;
    FechaFin?: string;
    Folio?: string;
    SerieDocumento?: string;
    RazonSocial?: string;
    FechaVencimientoInicio?: string;
    FechaVencimientoFin?: string;
    IdConcepto?: number;
    IdAgente?: number;
    IdDocumentoDe?: number;
    Page?: number;
    PageSize?: number;
    IncluirMovimientos?: boolean;
}