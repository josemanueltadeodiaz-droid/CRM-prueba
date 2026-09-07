using back_cabs.CRM.contexts;
using back_cabs.CRM.models;
using Microsoft.EntityFrameworkCore;

namespace back_cabs.CRM.services.Soporte
{
    public interface IGoogleTokenStore
    {
        Task<string?> GetRefreshTokenAsync(string userId);
        Task SaveOrUpdateAsync(
            int userId,
            string refreshToken,
            string? accessToken = null,
            string? scope = null,
            string? tokenType = null,
            DateTime? expiresAtUtc = null
        );
    }

    public class GoogleTokenStore : IGoogleTokenStore
    {
        private readonly WriteContext _db;

        public GoogleTokenStore(WriteContext db)
        {
            _db = db;
        }

        public async Task<string?> GetRefreshTokenAsync(string userId)
        {
            if (!int.TryParse(userId, out var uid)) return null;

            return await _db.GoogleUserTokens
                .Where(x => x.UserId == uid && x.Provider == "GOOGLE" && x.IsActive)
                .OrderByDescending(x => x.UpdatedAtUtc)
                .Select(x => x.RefreshToken)
                .FirstOrDefaultAsync();
        }

        public async Task SaveOrUpdateAsync(
            int userId,
            string refreshToken,
            string? accessToken = null,
            string? scope = null,
            string? tokenType = null,
            DateTime? expiresAtUtc = null)
        {
            var current = await _db.GoogleUserTokens
                .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == "GOOGLE" && x.IsActive);

            if (current == null)
            {
                current = new GoogleUserToken
                {
                    UserId = userId,
                    Provider = "GOOGLE",
                    RefreshToken = refreshToken,
                    AccessToken = accessToken,
                    Scope = scope,
                    TokenType = tokenType,
                    ExpiresAtUtc = expiresAtUtc,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow,
                    IsActive = true
                };
                _db.GoogleUserTokens.Add(current);
            }
            else
            {
                current.RefreshToken = refreshToken;
                current.AccessToken = accessToken;
                current.Scope = scope;
                current.TokenType = tokenType;
                current.ExpiresAtUtc = expiresAtUtc;
                current.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }
    }
}