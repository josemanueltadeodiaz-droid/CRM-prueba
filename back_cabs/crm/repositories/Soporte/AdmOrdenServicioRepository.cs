using System.Data;
using back_cabs.CRM.contexts;
using back_cabs.CRM.DTOs.Legacy;
using back_cabs.CRM.DTOs.Response;
using back_cabs.CRM.Interfaces.Legacy;
using back_cabs.CRM.Interfaces.Soporte;
using back_cabs.CRM.models.legacy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;


namespace back_cabs.CRM.repositories.Soporte
{
    /// <summary>
    /// Repositorio para AdmDocumentos
    /// </summary>
    public class AdmOrdenServicioRepository : IAdmOrdenServicioRepository
    {
        private readonly LegacyCompacReadOnlyContext _readContext;
        private readonly LegacyCompacWriteContext _writeContext;
        private readonly ILogger<AdmOrdenServicioRepository> _logger;

        public AdmOrdenServicioRepository(
            LegacyCompacReadOnlyContext readContext,
            LegacyCompacWriteContext writeContext,
            ILogger<AdmOrdenServicioRepository> logger)
        {
            _readContext = readContext;
            _writeContext = writeContext;
            _logger = logger;
        }
        #region  Metodos Principales

        public async Task<int> CreateDocumentoOrdenServicioAsync(AdmDocumento documento)
        {
            using var transaction = await _writeContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var connection = _writeContext.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                var dbTransaction = transaction.GetDbTransaction();

                // 1. Generar ID manual para Documento con lock para concurrencia
                int nuevoDocumentoId;
                await using (var cmd = connection.CreateCommand())
                {
                    cmd.Transaction = dbTransaction;
                    cmd.CommandText = @"
                        SELECT ISNULL(MAX(CIDDOCUMENTO), 0) + 1
                        FROM dbo.admDocumentos WITH (UPDLOCK, HOLDLOCK)";

                    var result = await cmd.ExecuteScalarAsync();
                    nuevoDocumentoId = Convert.ToInt32(result ?? 1);
                }

                documento.CIdDocumento = nuevoDocumentoId;

                // 2. Obtener folio correlativo con lock para concurrencia
                double nuevoFolio;
                await using (var cmd = connection.CreateCommand())
                {
                    cmd.Transaction = dbTransaction;
                    cmd.CommandText = @"
                        SELECT ISNULL(MAX(CFOLIO), 0) + 1
                        FROM dbo.admDocumentos WITH (UPDLOCK, HOLDLOCK)
                        WHERE CIDDOCUMENTODE = @idDocumentoDe
                          AND CIDCONCEPTODOCUMENTO = @idConcepto
                          AND CSERIEDOCUMENTO = @serie";

                    var pIdDocumentoDe = cmd.CreateParameter();
                    pIdDocumentoDe.ParameterName = "@idDocumentoDe";
                    pIdDocumentoDe.Value = documento.CIdDocumentoDe;
                    cmd.Parameters.Add(pIdDocumentoDe);

                    var pIdConcepto = cmd.CreateParameter();
                    pIdConcepto.ParameterName = "@idConcepto";
                    pIdConcepto.Value = documento.CIdConceptoDocumento;
                    cmd.Parameters.Add(pIdConcepto);

                    var pSerie = cmd.CreateParameter();
                    pSerie.ParameterName = "@serie";
                    pSerie.Value = documento.CSerieDocumento ?? "OS";
                    cmd.Parameters.Add(pSerie);

                    var result = await cmd.ExecuteScalarAsync();
                    nuevoFolio = Convert.ToDouble(result ?? 1d);
                }

                documento.CFolio = nuevoFolio;

                // 3. Insertar el documento
                await _writeContext.AdmDocumentos.AddAsync(documento);
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("✅ Documento creado con ID {DocumentoId}", documento.CIdDocumento);

                // 5. Actualizar el folio en admConceptos
                await UpdateFolioConceptoAsync(documento.CIdConceptoDocumento, nuevoFolio);

                // 6. Commit de la transacción
                await transaction.CommitAsync();

                _logger.LogInformation("✅ Orden de Servicio creada exitosamente - ID: {DocumentoId}, Folio: {Folio}",
                    documento.CIdDocumento, nuevoFolio);

                return documento.CIdDocumento;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "❌ Error creando documento con movimientos. Transacción revertida.");
                throw;
            }
        }

        // Metodo Para insertar movimientos en un documento existente
        public async Task InsertarServiciosAsync(int idDocumento, int idDocumentoDe, List<AdmMovimiento> servicios)
        {
            using var transaction = await _writeContext.Database.BeginTransactionAsync();
            try
            {
                // 1. Generar ID manual global
                var maxIdMovimiento = await _writeContext.AdmMovimientos
                    .OrderByDescending(m => m.CIdMovimiento)
                    .Select(m => m.CIdMovimiento)
                    .FirstOrDefaultAsync();


                double ultimoNumero = await _readContext.AdmMovimientos
                    .Where(m => m.CIdDocumento == idDocumento)
                    .OrderByDescending(m => m.CNumeroMovimiento)
                    .Select(m => m.CNumeroMovimiento)
                    .FirstOrDefaultAsync();

                _logger.LogInformation("ultimoNumero" + ultimoNumero);

                // 3. Asignar IDs y números correlativos a cada movimiento
                foreach (var servicio in servicios)
                {
                    servicio.CIdMovimiento = ++maxIdMovimiento;
                    servicio.CIdDocumento = idDocumento;
                    servicio.CIdDocumentoDe = idDocumentoDe;
                }

                // 4. Insertar todos de una sola vez
                await _writeContext.AdmMovimientos.AddRangeAsync(servicios);
                await _writeContext.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("Se insertaron {Cantidad} servicios para Documento ID {IdDocumento}",
                    servicios.Count, idDocumento);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error insertando servicios para Documento ID {IdDocumento}. Transacción revertida.", idDocumento);
                throw;
            }
        }

        public async Task<AdmMovimiento?> GetMovimientoByIdAsync(int idMovimiento)
        {
            try
            {
                var movimiento = await _readContext.AdmMovimientos
                    .FirstOrDefaultAsync(m => m.CIdMovimiento == idMovimiento);

                return movimiento;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error obteniendo movimiento {IdMovimiento}", idMovimiento);
                return null;
            }
        }

        /// <summary>
        /// Obtiene el último número de movimiento para un documento específico
        /// </summary>
        public async Task<double> GetUltimoNumeroMovimientoAsync(int documentoId)
        {
            try
            {

                var ultimoNumero = await _readContext.AdmMovimientos
                    .Where(m => m.CIdDocumento == documentoId)
                    .OrderByDescending(m => m.CNumeroMovimiento)
                    .Select(m => m.CNumeroMovimiento)
                    .FirstOrDefaultAsync();

                return ultimoNumero;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error obteniendo último número de movimiento para Doc {DocId}", documentoId);
                return 9999999;
            }
        }

        /// <summary>
        /// Actualiza las observaciones de un movimiento
        /// </summary>
        public async Task ActualizarObservacionesMovimientoAsync(int idMovimiento, string observaciones)
        {
            using var transaction = await _writeContext.Database.BeginTransactionAsync();
            try
            {
                var movimiento = await _writeContext.AdmMovimientos
                    .FirstOrDefaultAsync(m => m.CIdMovimiento == idMovimiento);

                if (movimiento == null)
                {
                    _logger.LogWarning("⚠️ Movimiento {IdMovimiento} no encontrado para actualizar observaciones", idMovimiento);
                    return;
                }

                movimiento.CObservaMov = observaciones;
                _writeContext.AdmMovimientos.Update(movimiento);
                await _writeContext.SaveChangesAsync();

                await transaction.CommitAsync();
                _logger.LogInformation("✅ Observaciones actualizadas para movimiento {IdMovimiento}: {Observaciones}",
                    idMovimiento, observaciones);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "❌ Error actualizando observaciones del movimiento {IdMovimiento}", idMovimiento);
                throw;
            }
        }

        public async Task<List<OrdenServicioDetalleResponseDto>> GetServicioByDocumentoIdAsync(int idDocumento)
        {
            return await _readContext.AdmMovimientos
                .AsNoTracking()
                .Where(m => m.CIdDocumento == idDocumento && m.CIdProducto == 393)
                .OrderBy(m => m.CNumeroMovimiento)
                .Select(m => new OrdenServicioDetalleResponseDto
                {
                    IdMovimiento = m.CIdMovimiento,
                    NumeroMovimiento = m.CNumeroMovimiento,
                    ObservacionesMovimiento = m.CObservaMov ?? ""
                })
                .ToListAsync();
        }

        public async Task<List<OrdenServicioDetalleResponseDto>> GetServiciosByDocumentosIdsAsync(List<int> documentosIds)
        {
            return await _readContext.AdmMovimientos
                .AsNoTracking()
                .Where(m => documentosIds.Contains(m.CIdDocumento) && m.CIdProducto == 393)
                .OrderBy(m => m.CNumeroMovimiento)
                .Select(m => new OrdenServicioDetalleResponseDto
                {
                    IdDocumento = m.CIdDocumento,
                    IdMovimiento = m.CIdMovimiento,
                    NumeroMovimiento = m.CNumeroMovimiento,
                    ObservacionesMovimiento = m.CObservaMov ?? ""
                })
                .ToListAsync();
        }

        public async Task<List<AdmDocumento>> GetDocumentosByIdsAsync(List<int> documentosIds)
        {
            if (documentosIds == null || documentosIds.Count == 0)
                return new List<AdmDocumento>();

            // EF.Constant forces EF Core 8 to emit an inline IN (...) clause instead of
            // using OPENJSON / table-valued parameters, which fail on older SQL Server versions.
            return await _readContext.AdmDocumentos
                .AsNoTracking()
                .Where(d => EF.Constant(documentosIds).Contains(d.CIdDocumento))
                .ToListAsync();
        }

        #endregion

        #region Metodos Auxiliares
        /// <summary>
        /// Obtiene el folio actual del concepto
        /// </summary>
        public async Task<double> GetFolioActualAsync(int idConcepto)
        {
            try
            {
                var concepto = await _readContext.AdmConceptos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.CIdConceptoDocumento == idConcepto);

                if (concepto == null)
                {
                    throw new InvalidOperationException($"No se encontró el concepto con ID {idConcepto}");
                }

                return concepto.CNoFolio;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error obteniendo folio del concepto {IdConcepto}", idConcepto);
                throw;
            }
        }


        /// <summary>
        /// Actualiza el folio del concepto
        /// </summary>
        public async Task UpdateFolioConceptoAsync(int idConcepto, double nuevoFolio)
        {
            try
            {
                var concepto = await _writeContext.AdmConceptos
                    .FirstOrDefaultAsync(c => c.CIdConceptoDocumento == idConcepto);

                if (concepto == null)
                {
                    throw new InvalidOperationException($"No se encontró el concepto con ID {idConcepto}");
                }

                concepto.CNoFolio = nuevoFolio;
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("✅ Folio del concepto {IdConcepto} actualizado a {NuevoFolio}", idConcepto, nuevoFolio);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error actualizando folio del concepto {IdConcepto}", idConcepto);
                throw;
            }
        }


        /// <summary>
        /// Verifica si la orden esta cerrada
        /// <summary>
        public async Task<bool> OrdenCerradaAsync(int idDocumento)
        {
            try
            {
                var orden = await _readContext.AdmDocumentos
                    .Where(m => m.CIdDocumento == idDocumento)
                    .FirstOrDefaultAsync();

                if (orden == null)
                {
                    throw new InvalidOperationException($"No se encontró la orden con ID {idDocumento}");
                }

                if (orden.CTextoExtra1 == "CERRADA")
                {
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error obteniendo orden {IdDocumento}", idDocumento);
                throw;
            }
        }

        /// <summary>
        /// Elimina un documento por su ID. Se usa como compensación si la creación de OrdenServicioActividad falla.
        /// </summary>
        public async Task DeleteDocumentoAsync(int documentoId)
        {
            try
            {
                var documento = await _writeContext.AdmDocumentos
                    .FirstOrDefaultAsync(d => d.CIdDocumento == documentoId);

                if (documento == null)
                {
                    _logger.LogWarning("⚠️ Documento {DocumentoId} no encontrado para eliminar (compensación)", documentoId);
                    return;
                }

                _writeContext.AdmDocumentos.Remove(documento);
                await _writeContext.SaveChangesAsync();

                _logger.LogInformation("🔄 Documento {DocumentoId} eliminado como compensación de transacción", documentoId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al eliminar documento {DocumentoId} en compensación", documentoId);
                throw;
            }
        }

        /// <summary>
        /// Actualiza el agente principal (CIDAGENTE) en admDocumentos.
        /// </summary>
        public async Task UpdateAgentePrincipalAsync(int documentoId, int idAgente)
        {
            using var transaction = await _writeContext.Database.BeginTransactionAsync();
            try
            {
                var documento = await _writeContext.AdmDocumentos
                    .FirstOrDefaultAsync(d => d.CIdDocumento == documentoId);

                if (documento == null)
                    throw new KeyNotFoundException($"Documento {documentoId} no encontrado.");

                documento.CIdAgente = idAgente;
                _writeContext.AdmDocumentos.Update(documento);
                await _writeContext.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("✅ AgentePrincipal actualizado en documento {DocumentoId} → {IdAgente}", documentoId, idAgente);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Actualiza las observaciones (COBSERVACIONES) en admDocumentos.
        /// </summary>
        public async Task UpdateObservacionesDocumentoAsync(int documentoId, string? observaciones)
        {
            using var transaction = await _writeContext.Database.BeginTransactionAsync();
            try
            {
                var documento = await _writeContext.AdmDocumentos
                    .FirstOrDefaultAsync(d => d.CIdDocumento == documentoId);

                if (documento == null)
                    throw new KeyNotFoundException($"Documento {documentoId} no encontrado.");

                documento.CObservaciones = observaciones;
                _writeContext.AdmDocumentos.Update(documento);
                await _writeContext.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("✅ Observaciones actualizadas en documento {DocumentoId}", documentoId);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Actualiza el cliente (CIDCLIENTEPROVEEDOR, CRAZONSOCIAL, CRFC) en admDocumentos.
        /// Busca los datos del cliente en admClientes antes de aplicar el cambio.
        /// </summary>
        public async Task UpdateClienteAsync(int documentoId, int idCliente)
        {
            // Obtener datos del cliente desde el catálogo legacy (solo lectura)
            var cliente = await _readContext.AdmClientes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CIdClienteProveedor == idCliente);

            if (cliente == null)
                throw new KeyNotFoundException($"Cliente con ID {idCliente} no encontrado en admClientes.");

            using var transaction = await _writeContext.Database.BeginTransactionAsync();
            try
            {
                var documento = await _writeContext.AdmDocumentos
                    .FirstOrDefaultAsync(d => d.CIdDocumento == documentoId);

                if (documento == null)
                    throw new KeyNotFoundException($"Documento {documentoId} no encontrado.");

                documento.CIdClienteProveedor = cliente.CIdClienteProveedor;
                documento.CRazonSocial        = cliente.CRazonSocial;
                documento.CRfc                = cliente.CRfc;

                _writeContext.AdmDocumentos.Update(documento);
                await _writeContext.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation(
                    "✅ Cliente actualizado en documento {DocumentoId} → IdCliente={IdCliente}, RazonSocial={RazonSocial}",
                    documentoId, idCliente, cliente.CRazonSocial);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        #endregion
    }
}