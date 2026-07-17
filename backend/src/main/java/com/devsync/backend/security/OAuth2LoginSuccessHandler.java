package com.devsync.backend.security;

import com.devsync.backend.config.props.AppProperties;
import com.devsync.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

    private final AuthService authService;
    private final RefreshTokenCookieService refreshTokenCookieService;
    private final AppProperties appProperties;

    public OAuth2LoginSuccessHandler(
            AuthService authService,
            RefreshTokenCookieService refreshTokenCookieService,
            AppProperties appProperties) {
        this.authService = authService;
        this.refreshTokenCookieService = refreshTokenCookieService;
        this.appProperties = appProperties;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        if (!(authentication instanceof OAuth2AuthenticationToken token)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        OAuth2User oauthUser = token.getPrincipal();
        Map<String, Object> attrs = oauthUser.getAttributes();
        String githubId = String.valueOf(attrs.get("id"));
        String login = attrs.get("login") != null ? String.valueOf(attrs.get("login")) : null;
        String email = attrs.get("email") != null ? String.valueOf(attrs.get("email")) : null;
        String name = attrs.get("name") != null ? String.valueOf(attrs.get("name")) : login;
        String avatar = attrs.get("avatar_url") != null ? String.valueOf(attrs.get("avatar_url")) : null;

        AuthService.AuthResult result = authService.upsertGithubUser(githubId, email, name, avatar);
        refreshTokenCookieService.setRefreshCookie(response, result.rawRefreshToken());
        // Never put tokens in the redirect URL
        String redirect = appProperties.getFrontendUrl().replaceAll("/$", "") + "/auth/callback";
        log.info("GitHub OAuth success for githubId={}, redirecting to frontend callback", githubId);
        response.sendRedirect(redirect);
    }
}
