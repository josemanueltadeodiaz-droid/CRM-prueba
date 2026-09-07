namespace back_cabs.CRM.models
{
    public class GoogleUserToken
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Provider { get; set; } = "GOOGLE";
        public string RefreshToken { get; set; } = "";
        public string? AccessToken { get; set; }
        public string? Scope { get; set; }
        public string? TokenType { get; set; }
        public DateTime? ExpiresAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }
}