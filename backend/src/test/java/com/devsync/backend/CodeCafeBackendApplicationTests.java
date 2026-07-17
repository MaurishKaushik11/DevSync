package com.devsync.backend;

import com.devsync.backend.config.TestRedisConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestRedisConfig.class)
class CodeCafeBackendApplicationTests {

	@Test
	void contextLoads() {
	}
}
