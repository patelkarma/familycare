package com.familycare.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

@Configuration
public class SosConfig {

    /**
     * Bounded executor for SOS message fan-out.
     * Max 8 threads — enough for ~4 contacts × 2 channels in parallel without spawning unbounded threads.
     */
    @Bean("sosFanOutExecutor")
    public ExecutorService sosFanOutExecutor() {
        return Executors.newFixedThreadPool(8, new ThreadFactory() {
            private final AtomicInteger counter = new AtomicInteger(1);

            @Override
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "sos-fanout-" + counter.getAndIncrement());
                t.setDaemon(true);
                return t;
            }
        });
    }
}
