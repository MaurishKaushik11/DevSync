package com.devsync.backend.config;

import com.devsync.backend.dto.TextOperation;
import com.devsync.backend.service.OtService;
import com.devsync.backend.service.SessionRegistryService;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@TestConfiguration
@Profile("test")
public class TestRedisConfig {

    private final Map<String, String> contentStore = new ConcurrentHashMap<>();

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        return Mockito.mock(RedisConnectionFactory.class);
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = Mockito.mock(RedisTemplate.class);
        Mockito.when(template.opsForValue()).thenReturn(Mockito.mock(ValueOperations.class));
        Mockito.when(template.opsForList()).thenReturn(Mockito.mock(ListOperations.class));
        Mockito.when(template.opsForHash()).thenReturn(Mockito.mock(HashOperations.class));
        Mockito.when(template.opsForSet()).thenReturn(Mockito.mock(SetOperations.class));
        return template;
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = Mockito.mock(StringRedisTemplate.class);
        Mockito.when(template.opsForSet()).thenReturn(Mockito.mock(SetOperations.class));
        Mockito.when(template.opsForValue()).thenReturn(Mockito.mock(ValueOperations.class));
        return template;
    }

    @Bean
    @Primary
    public RedisScript<Boolean> updateContentAndHistoryScript() {
        DefaultRedisScript<Boolean> script = new DefaultRedisScript<>();
        script.setScriptText("return true");
        script.setResultType(Boolean.class);
        return script;
    }

    @Bean
    @Primary
    public OtService otService() {
        OtService ot = Mockito.mock(OtService.class);
        Mockito.when(ot.getDocumentContent(Mockito.anyString(), Mockito.anyString())).thenAnswer(inv ->
                contentStore.getOrDefault(inv.getArgument(0) + ":" + inv.getArgument(1), ""));
        Mockito.when(ot.hasDocumentContent(Mockito.anyString(), Mockito.anyString())).thenAnswer(inv ->
                contentStore.containsKey(inv.getArgument(0) + ":" + inv.getArgument(1)));
        Mockito.doAnswer(inv -> {
            String key = inv.getArgument(0) + ":" + inv.getArgument(1);
            if (!contentStore.containsKey(key)) {
                contentStore.put(key, inv.getArgument(2) != null ? inv.getArgument(2) : "");
            }
            return null;
        }).when(ot).seedDocumentContentIfAbsent(Mockito.anyString(), Mockito.anyString(), Mockito.anyString());
        Mockito.doAnswer(inv -> {
            contentStore.put(inv.getArgument(0) + ":" + inv.getArgument(1),
                    inv.getArgument(2) != null ? inv.getArgument(2) : "");
            return null;
        }).when(ot).setDocumentContent(Mockito.anyString(), Mockito.anyString(), Mockito.anyString());
        Mockito.when(ot.getRevision(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
        Mockito.when(ot.getOperationHistory(Mockito.anyString(), Mockito.anyString())).thenReturn(Collections.emptyList());
        Mockito.when(ot.receiveOperation(Mockito.anyString(), Mockito.anyString(), Mockito.anyInt(), Mockito.any(TextOperation.class)))
                .thenAnswer(inv -> inv.getArgument(3));
        return ot;
    }

    @Bean
    @Primary
    public SessionRegistryService sessionRegistryService() {
        SessionRegistryService svc = Mockito.mock(SessionRegistryService.class);
        Mockito.when(svc.getActiveParticipantsForDocument(Mockito.anyString(), Mockito.anyString(), Mockito.nullable(String.class)))
                .thenReturn(List.of());
        Mockito.when(svc.userLeftDocument(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(true);
        Mockito.when(svc.userLeftAllSessions(Mockito.anyString())).thenReturn(List.of());
        return svc;
    }
}
