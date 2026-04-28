package com.familycare.service.whatsapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Intent {
    private IntentType type;
    @Builder.Default
    private Map<String, String> args = new HashMap<>();
    private String rawBody;

    public static Intent of(IntentType type, String rawBody) {
        return Intent.builder().type(type).rawBody(rawBody).args(new HashMap<>()).build();
    }

    public Intent put(String key, String value) {
        if (args == null) args = new HashMap<>();
        args.put(key, value);
        return this;
    }

    public String get(String key) {
        return args == null ? null : args.get(key);
    }
}
