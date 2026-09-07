using back_cabs.CRM.services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text;

namespace back_cabs.CRM.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class CachedAttribute : Attribute, IAsyncActionFilter
    {
        private readonly int _timeToLiveSeconds;

        public CachedAttribute(int timeToLiveSeconds)
        {
            _timeToLiveSeconds = timeToLiveSeconds;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Obtener configuración de Redis desde Services
            var cacheSettings = context.HttpContext.RequestServices.GetRequiredService<ICacheService>();

            var keys = GenerateCacheKeyFromRequest(context.HttpContext.Request);
            
            // Verificar si existe en cache
            var cachedResponse = await cacheSettings.GetAsync<string>(keys);

            if (!string.IsNullOrEmpty(cachedResponse))
            {
                var contentResult = new ContentResult
                {
                    Content = cachedResponse,
                    ContentType = "application/json",
                    StatusCode = 200
                };
                context.Result = contentResult;
                return;
            }

            // Ejecutar el controlador
            var executedContext = await next();

            // Si la ejecución fue exitosa y devolvió un OkObjectResult, guardar en cache
            if (executedContext.Result is OkObjectResult okObjectResult)
            {
                if (okObjectResult.Value != null)
                {
                    await cacheSettings.SetAsync(keys, okObjectResult.Value, TimeSpan.FromSeconds(_timeToLiveSeconds));
                }
            }
        }

        private static string GenerateCacheKeyFromRequest(HttpRequest request)
        {
            var keyBuilder = new StringBuilder();
            keyBuilder.Append($"{request.Path}");

            foreach (var (key, value) in request.Query.OrderBy(x => x.Key))
            {
                keyBuilder.Append($"|{key}-{value}");
            }

            return keyBuilder.ToString();
        }
    }
}
