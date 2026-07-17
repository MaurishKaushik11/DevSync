package com.devsync.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Maps a provider-supplied REDIS_URL (e.g. Railway/Heroku
 * {@code redis://default:password@host:port} or {@code rediss://...}) into the
 * Spring Redis properties consumed by {@code RedisConfig}. Only fills values
 * that were not already provided explicitly, and never logs the URL/credentials.
 */
public class RedisUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String redisUrl = environment.getProperty("REDIS_URL");
        if (!StringUtils.hasText(redisUrl)) {
            return;
        }
        // Respect explicit host configuration if present.
        String explicitHost = environment.getProperty("SPRING_REDIS_HOST");
        if (StringUtils.hasText(explicitHost)) {
            return;
        }
        try {
            URI uri = URI.create(redisUrl.trim());
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "redis";
            boolean ssl = "rediss".equals(scheme);

            Map<String, Object> props = new HashMap<>();
            if (StringUtils.hasText(uri.getHost())) {
                props.put("spring.redis.host", uri.getHost());
                props.put("spring.data.redis.host", uri.getHost());
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 6379;
            props.put("spring.redis.port", port);
            props.put("spring.data.redis.port", port);

            String userInfo = uri.getUserInfo();
            if (userInfo != null) {
                String password = userInfo.contains(":")
                        ? userInfo.substring(userInfo.indexOf(':') + 1)
                        : userInfo;
                if (StringUtils.hasText(password)) {
                    props.put("spring.redis.password", password);
                    props.put("spring.data.redis.password", password);
                }
            }

            props.put("spring.redis.ssl.enabled", ssl);
            props.put("spring.data.redis.ssl.enabled", ssl);

            environment.getPropertySources().addFirst(new MapPropertySource("redisUrlProps", props));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Invalid REDIS_URL", e);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 11;
    }
}
