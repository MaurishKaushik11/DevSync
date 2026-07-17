package com.devsync.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS is configured via SecurityConfig CorsConfigurationSource from ALLOWED_ORIGINS.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
