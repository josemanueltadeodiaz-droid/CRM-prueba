using back_cabs.CRM.models.Auth;
using back_cabs.CRM.models.Shared;
using back_cabs.CRM.models.Recepcion;
using back_cabs.CRM.models.Sales;
using back_cabs.CRM.models.Administracion;
using back_cabs.CRM.models.Soporte;
using back_cabs.CRM.models.Files;
using back_cabs.CRM.models;
using back_cabs.CRM.models.legacy;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace back_cabs.CRM.contexts;

/// <summary>
/// Contexto básico para operaciones de escritura (POST, PUT, DELETE)
/// </summary>
public class WriteContext : DbContext
{
    public WriteContext(DbContextOptions<WriteContext> options) : base(options)
    {
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.TrackAll;
        ChangeTracker.AutoDetectChangesEnabled = true;
    }
    public DbSet<OrdenServicioEntregable> OrdenServicioEntregables { get; set; }
    public DbSet<GoogleUserToken> GoogleUserTokens { get; set; } = null!;

    public DbSet<OrdenServicioActividad> OrdenServicioActividades { get; set; } = null!;
    public DbSet<UsuarioAuth> UsuariosAuth { get; set; } = null!;
    public DbSet<RecuperacionPasswordToken> RecuperacionPasswordTokens { get; set; } = null!;
    public DbSet<Actividad> Actividades { get; set; } = null!;
    public DbSet<Cotizacion> Cotizaciones { get; set; } = null!;
    public DbSet<Vehiculo> Vehiculos { get; set; } = null!;
    public DbSet<UsoVehiculo> UsoVehiculos { get; set; } = null!;
    public DbSet<Catalog_Clientes> CatalogClientes { get; set; } = null!;
    public DbSet<Catalog_Productos_Servicio_Ref> CatalogProductosServicios { get; set; } = null!;
    public DbSet<Evaluacion> Evaluaciones { get; set; } = null!;
    public DbSet<EvaluacionDetalle> EvaluacionesDetalles { get; set; } = null!;
    public DbSet<EvaluacionFoto> EvaluacionesFotos { get; set; } = null!;
    public DbSet<Reparacion> Reparaciones { get; set; } = null!;
    public DbSet<ReparacionComponente> ReparacionesComponentes { get; set; } = null!;
    public DbSet<ReparacionFoto> ReparacionesFotos { get; set; } = null!;
    public DbSet<EjecucionOrden> EjecucionesOrden { get; set; } = null!;
    public DbSet<FilesDocumento> Documentos { get; set; } = null!;
    public DbSet<GastoViatico> GastosViaticos { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<OrdenServicioEntregable>(entity =>
        {
            entity.ToTable("OrdenServicioEntregables"); // o el nombre real de tu tabla
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Tipo).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CodigoProducto).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NombreProducto).HasMaxLength(250).IsRequired();
            entity.Property(e => e.Cantidad).HasColumnType("decimal(18,2)");
            entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<UsuarioAuth>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<OrdenTrabajo>(entity =>
        {
            entity.ToTable("ops_ordenes_trabajo");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.NuevoCliente).HasColumnName("nuevo_cliente");
            entity.Property(e => e.NombreCliente).HasColumnName("nombre_cliente").HasMaxLength(120);
            entity.Property(e => e.ClienteId).HasColumnName("cliente_id").IsRequired(false);
            entity.Property(e => e.CreadoPorUserId).HasColumnName("creado_por_user_id").IsRequired();
            entity.Property(e => e.AsignadaAUserId).HasColumnName("asignada_a_user_id");
            entity.Property(e => e.Notas).HasColumnName("notas").HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.CitaProgramadaInicio).HasColumnName("cita_programada_inicio").HasColumnType("DATETIME2(0)");
            entity.Property(e => e.CitaProgramadaFin).HasColumnName("cita_programada_fin").HasColumnType("DATETIME2(0)");
            entity.Property(e => e.Modalidad).HasColumnName("modalidad").HasMaxLength(50);
            entity.Property(e => e.TipoOrden).HasColumnName("tipo_orden").HasMaxLength(50);
            entity.Property(e => e.Prioridad).HasColumnName("prioridad");
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired().HasDefaultValue("CAPTURADA");
            entity.Property(e => e.UbicacionText).HasColumnName("ubicacion_text").HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.RequiereFactura).HasColumnName("requiere_factura").IsRequired().HasDefaultValue(false);
            entity.Property(e => e.EstadoFacturado).HasColumnName("estado_facturado").HasMaxLength(50);
            entity.Property(e => e.FacturaFolio).HasColumnName("factura_folio").HasMaxLength(50);
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").HasColumnType("DATETIME2(0)").IsRequired().HasDefaultValueSql("GETDATE()");
            entity.Property(e => e.ActualizadoEn).HasColumnName("actualizado_en").HasColumnType("DATETIME2(0)");
            entity.Property(e => e.CostoReal).HasColumnName("costo_real").HasColumnType("DECIMAL(12,2)");
            entity.Property(e => e.CostoEstimado).HasColumnName("costo_estimado").HasColumnType("DECIMAL(12,2)");

            entity.HasOne(e => e.CreadoPor).WithMany().HasForeignKey(e => e.CreadoPorUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.AsignadaA).WithMany().HasForeignKey(e => e.AsignadaAUserId).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.ClienteId, e.CreadoEn }).HasDatabaseName("IX_ordenes_cliente");
            entity.HasIndex(e => new { e.Estado, e.AsignadaAUserId }).HasDatabaseName("IX_ordenes_estado_asignado");
            entity.HasIndex(e => e.CitaProgramadaInicio);
        });

        modelBuilder.Entity<Vehiculo>(entity =>
        {
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.TipoVehiculo).HasColumnName("tipo_vehiculo").HasMaxLength(50);
            entity.Property(e => e.Transmision).HasColumnName("transmision").HasMaxLength(20);
            entity.Property(e => e.EsDeEmpresa).HasColumnName("es_de_empresa").IsRequired().HasDefaultValue(true);
            entity.Property(e => e.Placas).HasColumnName("placas").HasMaxLength(20);
            entity.Property(e => e.Activo).HasColumnName("activo").IsRequired().HasDefaultValue(true);
            entity.Property(e => e.Observaciones).HasColumnName("observaciones").HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.NombreVehiculo).HasColumnName("nombre_vehiculo").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Kilometraje).HasColumnName("kilometraje");
            entity.HasIndex(e => e.Placas).IsUnique().HasFilter("[placas] IS NOT NULL");
            entity.HasKey(e => e.Id);
            entity.ToTable(tb => tb.UseSqlOutputClause(false));
        });

        modelBuilder.Entity<Catalog_Clientes>(entity =>
        {
            entity.HasIndex(e => e.LegacyClientId).IsUnique().HasFilter("[legacy_client_id] IS NOT NULL");
            entity.HasIndex(e => e.Email).HasFilter("[email] IS NOT NULL");
            entity.HasIndex(e => e.RFC).IsUnique().HasFilter("[rfc] IS NOT NULL");
        });

        modelBuilder.Entity<Catalog_Productos_Servicio_Ref>(entity =>
        {
            entity.HasIndex(e => e.Nombre);
            entity.HasIndex(e => e.LegacyProductId).IsUnique().HasFilter("[legacy_product_id] IS NOT NULL");
        });

        modelBuilder.Entity<Evaluacion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.OrdenId, e.CreadoEn });
            entity.HasIndex(e => e.EvaluadorId);
            entity.HasIndex(e => e.ClienteId).HasFilter("[cliente_id] IS NOT NULL");
            entity.Property(e => e.Objetivo).HasMaxLength(200);
            entity.Property(e => e.ComentariosGenerales).HasColumnName("comentarios_generales");
            entity.Property(e => e.ScoreCalidadTotal).HasColumnName("score_calidad_total");
            entity.Property(e => e.RequiereSeguimiento).HasColumnName("requiere_seguimiento").IsRequired(true);
            entity.Property(e => e.SeguimientoNotas).HasColumnName("seguimiento_notas");
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").HasColumnType("DATETIME2(0)").IsRequired().HasDefaultValueSql("GETUTCDATE()");
        });

        modelBuilder.Entity<EvaluacionDetalle>(entity =>
        {
            entity.ToTable("evaluacion_detalles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.EvaluacionId).HasColumnName("evaluacion_id").IsRequired();
            entity.Property(e => e.Fase).HasColumnName("fase").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion");
            entity.Property(e => e.Sugerencias).HasColumnName("sugerencias");
            entity.Property(e => e.ScoreFase).HasColumnName("score_fase");
            entity.Property(e => e.EvidenciaNota).HasColumnName("evidencia_nota");
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").HasColumnType("DATETIME2(0)").IsRequired().HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.Lugar).HasColumnName("lugar").IsRequired();
            entity.HasOne(e => e.Evaluacion).WithMany().HasForeignKey(e => e.EvaluacionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.EvaluacionId);
            entity.HasIndex(e => new { e.EvaluacionId, e.Fase });
        });

        modelBuilder.Entity<EvaluacionFoto>(entity =>
        {
            entity.HasIndex(e => e.DetalleId);
            entity.HasIndex(e => e.DocumentoId);
        });

        modelBuilder.Entity<Reparacion>(entity =>
        {
            entity.ToTable("reparaciones", "dbo");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.OrdenId).HasColumnName("orden_id").IsRequired();
            entity.Property(e => e.TecnicoId).HasColumnName("tecnico_id").IsRequired();
            entity.Property(e => e.DescripcionFalla).HasColumnName("descripcion_falla").IsRequired();
            entity.Property(e => e.Resultado).HasColumnName("resultado").IsRequired();
            entity.Property(e => e.RespaldoDatosAutorizado).HasColumnName("respaldo_datos_autorizado").IsRequired();
            entity.Property(e => e.CostoManoObra).HasColumnName("costo_mano_obra").HasColumnType("DECIMAL(12,2)").IsRequired();
            entity.Property(e => e.CostoRefaccionesCompra).HasColumnName("costo_refacciones_compra").HasColumnType("DECIMAL(12,2)").IsRequired();
            entity.Property(e => e.CostoRefaccionesPublico).HasColumnName("costo_refacciones_publico").HasColumnType("DECIMAL(12,2)").IsRequired();
            entity.Property(e => e.CostoTotalCompra).HasColumnName("costo_total_compra").ValueGeneratedOnAddOrUpdate().HasComputedColumnSql("[costo_mano_obra] + [costo_refacciones_compra]").HasColumnType("DECIMAL(12,2)").IsRequired();
            entity.Property(e => e.CostoTotalPublico).HasColumnName("costo_total_publico").ValueGeneratedOnAddOrUpdate().HasComputedColumnSql("[costo_mano_obra] + [costo_refacciones_publico]").HasColumnType("DECIMAL(12,2)").IsRequired();
            entity.Property(e => e.MargenEstimado).HasColumnName("margen_estimado").ValueGeneratedOnAddOrUpdate().HasComputedColumnSql("[costo_refacciones_publico] - [costo_refacciones_compra]").HasColumnType("DECIMAL(5,2)");
            entity.Property(e => e.FechaLlegada).HasColumnName("fecha_llegada").HasColumnType("DATETIME2(0)").IsRequired();
            entity.HasIndex(e => e.OrdenId);
            entity.HasIndex(e => e.TecnicoId);
            entity.HasIndex(e => new { e.Resultado, e.FechaLlegada });
            entity.HasIndex(e => e.FechaLlegada);
        });

        modelBuilder.Entity<ReparacionComponente>(entity =>
        {
            entity.ToTable("reparacion_componentes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().IsRequired();
            entity.Property(e => e.ReparacionId).HasColumnName("reparacion_id").IsRequired();
            entity.Property(e => e.Componente).HasColumnName("componente").IsRequired();
            entity.Property(e => e.Cantidad).HasColumnName("cantidad").IsRequired();
            entity.Property(e => e.CostoUnitarioCompra).HasColumnName("costo_unitario_compra").HasColumnType("DECIMAL(12,2)");
            entity.Property(e => e.CostoUnitarioPublico).HasColumnName("costo_unitario_publico").HasColumnType("DECIMAL(12,2)");
            entity.Property(e => e.SubtotalCompra).HasColumnName("subtotal_compra").HasColumnType("DECIMAL(13,2)").ValueGeneratedOnAddOrUpdate().HasComputedColumnSql("[cantidad] * [costo_unitario_compra]").IsRequired();
            entity.Property(e => e.SubtotalPublico).HasColumnName("subtotal_publico").HasColumnType("DECIMAL(13,2)").ValueGeneratedOnAddOrUpdate().HasComputedColumnSql("[cantidad] * [costo_unitario_publico]").IsRequired();
            entity.HasIndex(e => e.ReparacionId);
            entity.HasIndex(e => e.Componente);
        });

        modelBuilder.Entity<ReparacionFoto>(entity =>
        {
            entity.ToTable("reparacion_fotos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd().IsRequired();
            entity.Property(e => e.ReparacionId).HasColumnName("reparacion_id").IsRequired();
            entity.Property(e => e.DocumentoId).HasColumnName("documento_id").IsRequired();
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").HasColumnType("DATETIME2(0)").IsRequired().HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.ReparacionId);
            entity.HasIndex(e => e.DocumentoId);
            entity.HasIndex(e => new { e.ReparacionId, e.Etapa });
        });

        modelBuilder.Entity<EjecucionOrden>(entity =>
        {
            entity.ToTable("ops_ejecuciones_orden");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.OrdenId).HasColumnName("orden_id").IsRequired();
            entity.Property(e => e.TipoEjecucion).HasColumnName("tipo_ejecucion").HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(e => e.TecnicoId).HasColumnName("tecnico_id").IsRequired();
            entity.Property(e => e.HrInicio).HasColumnName("hr_inicio").HasColumnType("DATETIME2(0)");
            entity.Property(e => e.HrFin).HasColumnName("hr_fin").HasColumnType("DATETIME2(0)");
            entity.HasOne(e => e.Orden).WithMany().HasForeignKey(e => e.OrdenId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Tecnico).WithMany().HasForeignKey(e => e.TecnicoId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Vehiculo).WithMany().HasForeignKey(e => e.VehiculoId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.OrdenId);
            entity.HasIndex(e => e.TecnicoId);
            entity.HasIndex(e => new { e.OrdenId, e.TipoEjecucion, e.HrInicio });
            entity.HasIndex(e => e.HrInicio);
        });

        modelBuilder.Entity<FilesDocumento>(entity =>
        {
            entity.HasIndex(e => e.CreadoPorUsuarioId);
            entity.HasIndex(e => new { e.EntidadTipo, e.EntidadId });
            entity.HasIndex(e => e.RutaAlmacenamiento).IsUnique();
            entity.HasIndex(e => e.NombreArchivo);
        });

        modelBuilder.Entity<OrdenServicioActividad>(entity =>
        {
            entity.ToTable("OrdenServicioActividad", "dbo");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalHoras).HasPrecision(18, 2);
            entity.Property(e => e.Latitud).HasPrecision(18, 6);
            entity.Property(e => e.Longitud).HasPrecision(18, 6);
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);
            entity.Property(e => e.Iva).HasPrecision(18, 2);
            entity.Property(e => e.TotalConIva).HasPrecision(18, 2);
            entity.HasIndex(e => e.DocumentoId).IsUnique();
            entity.Property(e => e.Observaciones).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.NotasSoporte).HasColumnType("NVARCHAR(MAX)");
        });

        modelBuilder.Entity<GastoViatico>(entity =>
        {
            entity.ToTable("finance_gastos_viaticos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.OrdenId).HasColumnName("orden_id");
            entity.Property(e => e.MontoTotal).HasColumnName("monto_total").HasColumnType("decimal(12,2)");
            entity.HasIndex(e => e.OrdenId);
            entity.HasIndex(e => e.Fecha);
        });

        modelBuilder.Entity<GoogleUserToken>(e =>
        {
            e.ToTable("GoogleUserTokens");
            e.HasKey(x => x.Id);

            e.Property(x => x.Provider).HasMaxLength(30).IsRequired();
            e.Property(x => x.RefreshToken).HasMaxLength(2000).IsRequired();
            e.Property(x => x.AccessToken).HasMaxLength(4000);
            e.Property(x => x.Scope).HasMaxLength(1000);
            e.Property(x => x.TokenType).HasMaxLength(50);

            e.Property(x => x.CreatedAtUtc).HasColumnType("datetime2").IsRequired();
            e.Property(x => x.UpdatedAtUtc).HasColumnType("datetime2").IsRequired();

            e.HasIndex(x => new { x.UserId, x.Provider, x.IsActive })
             .HasDatabaseName("UX_GoogleUserTokens_User_Active")
             .IsUnique()
             .HasFilter("[IsActive] = 1");
        });
    }
}