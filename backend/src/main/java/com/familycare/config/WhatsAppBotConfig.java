package com.familycare.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class WhatsAppBotConfig {

    @Bean(name = "whatsappBotExecutor")
    public ExecutorService whatsappBotExecutor() {
        AtomicInteger counter = new AtomicInteger();
        return new ThreadPoolExecutor(
                2, 4,
                30, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(64),
                runnable -> {
                    Thread t = new Thread(runnable, "whatsapp-bot-" + counter.incrementAndGet());
                    t.setDaemon(true);
                    return t;
                },
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
