package com.familycare.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PharmacyResponse {
    private Long id;
    private String name;
    private Double lat;
    private Double lng;
    private String address;
    private String phone;
    private String openingHours;
    private Integer distanceMeters;
}
