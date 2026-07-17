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
 * Maps Heroku-style DATABASE_URL into Spring datasource properties before auto-config runs.
 * No credential defaults are introduced.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (!StringUtils.hasText(databaseUrl)) {
            return;
        }
        if (StringUtils.hasText(environment.getProperty("spring.datasource.url"))) {
            return;
        }
        try {
            Map<String, Object> props = new HashMap<>();
            String normalized = databaseUrl;
            if (normalized.startsWith("postgres://")) {
                normalized = "postgresql://" + normalized.substring("postgres://".length());
            }
            if (normalized.startsWith("jdbc:")) {
                props.put("spring.datasource.url", normalized);
            } else {
                URI uri = URI.create(normalized);
                String userInfo = uri.getUserInfo();
                if (userInfo != null) {
                    String[] parts = userInfo.split(":", 2);
                    props.put("spring.datasource.username", parts[0]);
                    if (parts.length > 1) {
                        props.put("spring.datasource.password", parts[1]);
                    }
                }
                String path = uri.getPath() != null ? uri.getPath() : "";
                String query = uri.getRawQuery() != null ? "?" + uri.getRawQuery() : "";
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                props.put("spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + ":" + port + path + query);
            }
            environment.getPropertySources().addFirst(new MapPropertySource("databaseUrlProps", props));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Invalid DATABASE_URL", e);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
