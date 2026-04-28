package com.familycare.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_KEY = "bearer-jwt";

    @Bean
    public OpenAPI familyCareOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("FamilyCare API")
                        .version("1.0")
                        .description(
                                "Multi-user family-health SaaS. Endpoints below cover medicines, "
                                        + "reminders, vitals, OCR prescription parsing, SOS, AI assistant, "
                                        + "drug-interaction checks, and the WhatsApp two-way bot webhook.")
                        .contact(new Contact().name("FamilyCare").email("hello@familycare.in"))
                        .license(new License().name("MIT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_KEY))
                .components(new Components().addSecuritySchemes(BEARER_KEY,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the JWT returned by /api/auth/login")));
    }
}
