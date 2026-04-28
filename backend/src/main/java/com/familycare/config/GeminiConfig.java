package com.familycare.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class GeminiConfig {

    @Bean(name = "geminiRestTemplate")
    public RestTemplate geminiRestTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(10))
                // Vision calls (pill identification) sometimes take 30-50s;
                // keep this generous so the call doesn't time out before Gemini answers.
                .readTimeout(Duration.ofSeconds(60))
                .build();
    }
}
