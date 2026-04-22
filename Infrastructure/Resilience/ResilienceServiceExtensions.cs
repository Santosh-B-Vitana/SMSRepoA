using SmsApi.Services;

namespace SmsApi.Infrastructure.Resilience;

/// <summary>
/// Extension methods for wrapping registered services with Polly resilience decorators.
/// Call <see cref="AddResiliencePatterns"/> AFTER registering the base services.
/// </summary>
public static class ResilienceServiceExtensions
{
    /// <summary>
    /// Decorates <see cref="IEmailService"/> with retry + circuit-breaker policies.
    /// </summary>
    public static IServiceCollection AddResiliencePatterns(this IServiceCollection services)
    {
        // Decorate Email Service
        Decorate<IEmailService, ResilientEmailService>(services);

        return services;
    }

    // -------------------------------------------------------------------------
    // Decorator helper — manually replaces the registered implementation
    // with a wrapper that delegates to the inner service.
    // -------------------------------------------------------------------------
    private static void Decorate<TInterface, TDecorator>(IServiceCollection services)
        where TInterface : class
        where TDecorator : class, TInterface
    {
        var original = services.FirstOrDefault(d => d.ServiceType == typeof(TInterface));
        if (original is null) return;

        services.Remove(original);

        // Re-register inner service under its concrete type so the decorator can resolve it
        if (original.ImplementationType is not null)
        {
            services.Add(ServiceDescriptor.Describe(
                original.ImplementationType,
                original.ImplementationType,
                original.Lifetime));
        }
        else if (original.ImplementationInstance is not null)
        {
            services.AddSingleton(original.ImplementationType ?? typeof(TInterface), original.ImplementationInstance);
        }

        // Register decorator
        services.Add(ServiceDescriptor.Describe(
            typeof(TInterface),
            sp =>
            {
                var inner = original.ImplementationType is not null
                    ? (TInterface)sp.GetRequiredService(original.ImplementationType)
                    : original.ImplementationInstance is not null
                        ? (TInterface)original.ImplementationInstance
                        : (TInterface)original.ImplementationFactory!(sp);

                return ActivatorUtilities.CreateInstance<TDecorator>(sp, inner);
            },
            original.Lifetime));
    }
}
