using back_cabs.CRM.models.Shared;

namespace back_cabs.CRM.Interfaces.Shared
{
    /// <summary>
    /// Contrato para operaciones de acceso a datos de Vehículos.
    /// Define qué operaciones están disponibles sin especificar cómo se implementan.
    /// </summary>
    public interface IVehiculoRepository
    {
        // 📖 OPERACIONES DE LECTURA
        /// <summary>
        /// Obtiene todos los vehículos ordenados por placas
        /// </summary>
        Task<IEnumerable<Vehiculo>> GetAllAsync();

        /// <summary>
        /// Obtiene un vehículo por su ID
        /// </summary>
        /// <param name="id">ID del vehículo</param>
        Task<Vehiculo?> GetByIdAsync(int id);

        /// <summary>
        /// Obtiene vehículos por tipo
        /// </summary>
        Task<IEnumerable<Vehiculo>> GetByTipoAsync(string tipoVehiculo);

        /// <summary>
        /// Obtiene solo vehículos activos
        /// </summary>
        Task<IEnumerable<Vehiculo>> GetActivosAsync();

        /// <summary>
        /// Busca vehículo por placas exactas
        /// </summary>
        Task<Vehiculo?> GetByPlacasAsync(string placas);

        /// <summary>
        /// Verifica si existe un vehículo con el ID especificado
        /// </summary>
        Task<bool> ExistsAsync(int id);

        /// <summary>
        /// Verifica si las placas ya están registradas
        /// </summary>
        Task<bool> PlacasExistAsync(string placas);

        // OPERACIONES DE ESCRITURA
        /// <summary>
        /// Crea un nuevo vehículo
        /// </summary>
        Task<Vehiculo> CreateAsync(Vehiculo vehiculo);

        /// <summary>
        /// Actualiza un vehículo existente
        /// </summary>
        Task<Vehiculo> UpdateAsync(Vehiculo vehiculo);

        /// <summary>
        /// Elimina un vehículo por ID
        /// </summary>
        Task<bool> DeleteAsync(int id);

        // ✅ TRANSACCIONAL - Operaciones Compuestas Atómicas

        /// <summary>
        /// ✅ TRANSACCIONAL: Registra el inicio de uso de un vehículo de forma atómica.
        /// Operaciones:
        /// 1. Verifica disponibilidad del vehículo
        /// 2. Crea registro en UsoVehiculo
        /// 3. Marca vehículo como NO disponible (Disponible = false)
        /// 4. Actualiza kilometraje si es necesario
        /// 
        /// ✅ GARANTÍA: Si alguna operación falla, se hace ROLLBACK de todas
        /// </summary>
        /// <param name="vehiculoId">ID del vehículo</param>
        /// <param name="usoVehiculo">Registro de uso a crear</param>
        /// <param name="kilomterjajeInicial">Kilometraje actual del vehículo</param>
        /// <returns>El vehículo actualizado</returns>
        Task<Vehiculo> RegistrarInicioUsoCompletoAsync(int vehiculoId, UsoVehiculo usoVehiculo, int kilomterjajeInicial);

        /// <summary>
        /// ✅ TRANSACCIONAL: Finaliza el uso de un vehículo de forma atómica.
        /// Operaciones:
        /// 1. Encuentra el uso activo del vehículo
        /// 2. Actualiza registro de uso (FechaFin, KilometrajeFinal, Estado)
        /// 3. Marca vehículo como disponible (Disponible = true)
        /// 4. Actualiza kilometraje del vehículo
        /// 
        /// ✅ GARANTÍA: Si alguna operación falla, se hace ROLLBACK de todas
        /// </summary>
        /// <param name="vehiculoId">ID del vehículo</param>
        /// <param name="usoVehiculo">Registro de uso con actualizaciones</param>
        /// <param name="kilomtrajeFinal">Kilometraje final del vehículo</param>
        /// <returns>El vehículo actualizado</returns>
        Task<Vehiculo> FinalizarUsoCompletoAsync(int vehiculoId, UsoVehiculo usoVehiculo, int kilomtrajeFinal);
    }
}