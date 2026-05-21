package com.library.apigateway.config;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator gatewayRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("auth-service", r -> r.path("/api/auth/**")
                        .uri("http://localhost:8081"))
                .route("student-service", r -> r.path("/api/students/**")
                        .uri("http://localhost:8082"))
                .route("seat-service", r -> r.path("/api/seats/**", "/api/bookings/**")
                        .uri("http://localhost:8083"))
                .route("payment-service", r -> r.path("/api/payments/**")
                        .uri("http://localhost:8084"))
                .route("notification-service", r -> r.path("/api/notifications/**")
                        .uri("http://localhost:8085"))
                .route("admin-service", r -> r.path("/api/admin/**")
                        .uri("http://localhost:8086"))
                .build();
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public GlobalFilter requestLoggingFilter() {
        return new RequestLoggingFilter();
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 1)
    public GlobalFilter authRateLimitFilter() {
        return new AuthRateLimitFilter();
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 2)
    public GlobalFilter jwtValidationFilter() {
        return new JwtValidationFilter();
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration());
        return new CorsWebFilter(source);
    }

    private CorsConfiguration corsConfiguration() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Collections.singletonList("http://localhost:3000"));
        config.setAllowedMethods(Collections.singletonList("GET"));
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");
        config.setAllowedHeaders(Collections.singletonList("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(Duration.ofHours(1));
        return config;
    }

    private static final class RequestLoggingFilter implements GlobalFilter, Ordered {
        private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
            ServerHttpRequest request = exchange.getRequest();
            Instant start = Instant.now();

            return chain.filter(exchange).doOnSuccessOrError((aVoid, throwable) -> {
                ServerHttpResponse response = exchange.getResponse();
                long durationMs = Duration.between(start, Instant.now()).toMillis();
                log.info("[Gateway] {} {} -> {} ({} ms)",
                        request.getMethod(), request.getURI().getRawPath(), response.getStatusCode(), durationMs);
            });
        }

        @Override
        public int getOrder() {
            return Ordered.HIGHEST_PRECEDENCE;
        }
    }

    private static final class AuthRateLimitFilter implements GlobalFilter, Ordered {
        private static final Logger log = LoggerFactory.getLogger(AuthRateLimitFilter.class);
        private static final int MAX_REQUESTS = 5;
        private static final Duration WINDOW = Duration.ofMinutes(1);
        private final Map<String, RequestWindow> requestCounts = new ConcurrentHashMap<>();

        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
            if (!exchange.getRequest().getURI().getPath().equalsIgnoreCase("/api/auth/login")) {
                return chain.filter(exchange);
            }

            String clientIp = extractClientIp(exchange.getRequest());
            RequestWindow window = requestCounts.computeIfAbsent(clientIp, key -> new RequestWindow());
            synchronized (window) {
                if (window.resetIfNecessary()) {
                    window.counter.set(0);
                }
                if (window.counter.incrementAndGet() > MAX_REQUESTS) {
                    log.warn("Rate limit exceeded for IP {} on /api/auth/login", clientIp);
                    exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                    return exchange.getResponse().setComplete();
                }
            }

            return chain.filter(exchange);
        }

        private String extractClientIp(ServerHttpRequest request) {
            String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                return xForwardedFor.split(",")[0].trim();
            }
            if (request.getRemoteAddress() != null) {
                return request.getRemoteAddress().getAddress().getHostAddress();
            }
            return "unknown";
        }

        @Override
        public int getOrder() {
            return Ordered.HIGHEST_PRECEDENCE + 1;
        }

        private static final class RequestWindow {
            private final AtomicInteger counter = new AtomicInteger(0);
            private Instant windowStart = Instant.now();

            boolean resetIfNecessary() {
                if (Duration.between(windowStart, Instant.now()).compareTo(WINDOW) >= 0) {
                    windowStart = Instant.now();
                    return true;
                }
                return false;
            }
        }
    }

    private static final class JwtValidationFilter implements GlobalFilter, Ordered {
        private static final Logger log = LoggerFactory.getLogger(JwtValidationFilter.class);

        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
            String path = exchange.getRequest().getURI().getPath();
            if (path.startsWith("/api/auth/")) {
                return chain.filter(exchange);
            }

            String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authorization == null || !authorization.startsWith("Bearer ")
                    || !looksLikeJwt(authorization.substring(7))) {
                log.warn("Missing or invalid Authorization header for path {}", path);
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            return chain.filter(exchange);
        }

        private boolean looksLikeJwt(String token) {
            return token != null && token.split("\\.").length == 3;
        }

        @Override
        public int getOrder() {
            return Ordered.HIGHEST_PRECEDENCE + 2;
        }
    }
}
