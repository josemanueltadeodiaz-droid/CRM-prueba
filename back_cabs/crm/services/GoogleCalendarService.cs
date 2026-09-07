using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Util;
using Microsoft.Extensions.Options;
using CRM_CABS.Configuration;
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web;

namespace CRM_CABS.Services
{
    public interface IGoogleCalendarService
    {
        string GetAuthUrl(string state);
        Task<(string AccessToken, string RefreshToken, string? Scope, string? TokenType, DateTime? ExpiresAtUtc)> ExchangeCodeAsync(string code);
        Task<string> RefreshAccessTokenAsync(string refreshToken);
        Task<string> CreateEventAsync(
            string accessToken,
            string summary,
            string description,
            string location,
            DateTime start,
            DateTime end
        );
        Task<string> CreateAllDayEventAsync(
            string accessToken,
            string summary,
            string description,
            string location,
            string date
        );
    }

    public class GoogleCalendarService : IGoogleCalendarService
    {
        private readonly GoogleCalendarOptions _options;

        public GoogleCalendarService(IOptions<GoogleCalendarOptions> options)
        {
            _options = options.Value;
        }

        public string GetAuthUrl(string state)
        {
            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = _options.ClientId,
                    ClientSecret = _options.ClientSecret
                },
                Scopes = new[] { CalendarService.Scope.CalendarEvents }
            });

            var req = flow.CreateAuthorizationCodeRequest(_options.RedirectUri);
            req.State = state;

            var baseUrl = req.Build().ToString();
            baseUrl = RemoveQueryParam(baseUrl, "access_type");
            baseUrl = RemoveQueryParam(baseUrl, "prompt");

            return baseUrl + (baseUrl.Contains("?") ? "&" : "?") + "access_type=offline&prompt=consent";
        }

        public async Task<(string AccessToken, string RefreshToken, string? Scope, string? TokenType, DateTime? ExpiresAtUtc)> ExchangeCodeAsync(string code)
        {
            var tokenRequest = new AuthorizationCodeTokenRequest
            {
                ClientId = _options.ClientId,
                ClientSecret = _options.ClientSecret,
                Code = code,
                RedirectUri = _options.RedirectUri
            };

            using var httpClient = new HttpClient();

            var token = await tokenRequest.ExecuteAsync(
                httpClient,
                GoogleAuthConsts.OidcTokenUrl,
                CancellationToken.None,
                SystemClock.Default
            );

            DateTime? expiresAtUtc = null;
            if (token.ExpiresInSeconds.HasValue)
                expiresAtUtc = DateTime.UtcNow.AddSeconds(token.ExpiresInSeconds.Value);

            return (
                token.AccessToken ?? "",
                token.RefreshToken ?? "",
                token.Scope,
                token.TokenType,
                expiresAtUtc
            );
        }

        public async Task<string> RefreshAccessTokenAsync(string refreshToken)
        {
            var req = new RefreshTokenRequest
            {
                ClientId = _options.ClientId,
                ClientSecret = _options.ClientSecret,
                RefreshToken = refreshToken
            };

            using var httpClient = new HttpClient();

            var token = await req.ExecuteAsync(
                httpClient,
                GoogleAuthConsts.OidcTokenUrl,
                CancellationToken.None,
                SystemClock.Default
            );

            return token.AccessToken ?? "";
        }

        public async Task<string> CreateEventAsync(
            string accessToken,
            string summary,
            string description,
            string location,
            DateTime start,
            DateTime end)
        {
            var credential = GoogleCredential.FromAccessToken(accessToken);

            var calendar = new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "CRM-CABS"
            });

            // Ensure DateTimes are treated as UTC to produce valid RFC3339 output
            var startUtc = start.Kind == DateTimeKind.Utc ? start : DateTime.SpecifyKind(start, DateTimeKind.Utc);
            var endUtc = end.Kind == DateTimeKind.Utc ? end : DateTime.SpecifyKind(end, DateTimeKind.Utc);

            var newEvent = new Event
            {
                Summary = summary,
                Description = description,
                Location = location,
                Start = new EventDateTime
                {
                    DateTime = startUtc,
                    TimeZone = "America/Mexico_City"
                },
                End = new EventDateTime
                {
                    DateTime = endUtc,
                    TimeZone = "America/Mexico_City"
                }
            };

            var created = await calendar.Events.Insert(newEvent, "primary").ExecuteAsync();
            return created.HtmlLink ?? created.Id ?? "";
        }

        public async Task<string> CreateAllDayEventAsync(
            string accessToken,
            string summary,
            string description,
            string location,
            string date)
        {
            var credential = GoogleCredential.FromAccessToken(accessToken);

            var calendar = new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "CRM-CABS"
            });

            var newEvent = new Event
            {
                Summary = summary,
                Description = description,
                Location = location,
                Start = new EventDateTime { Date = date },
                End = new EventDateTime { Date = date }
            };

            var created = await calendar.Events.Insert(newEvent, "primary").ExecuteAsync();
            return created.HtmlLink ?? created.Id ?? "";
        }

        private static string RemoveQueryParam(string url, string key)
        {
            var uri = new Uri(url);
            var query = HttpUtility.ParseQueryString(uri.Query);
            query.Remove(key);

            var builder = new UriBuilder(uri)
            {
                Query = query.ToString() ?? string.Empty
            };

            return builder.Uri.ToString();
        }
    }
}