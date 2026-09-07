namespace back_cabs.CRM.DTOs.Response
{
    public class OrdenServicioPruebasResumenDto
    {
        public int TotalOrdenes { get; set; }
        public int OrdenesEnEspera { get; set; }
        public int OrdenesEnProceso { get; set; }
        public int OrdenesTerminadas { get; set; }
    }
}
