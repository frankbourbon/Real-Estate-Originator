package com.cre.loan.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "properties")
public class Property {

    @Id
    private String id;

    @Column(nullable = false)
    private String streetAddress;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String zipCode;

    @Column(nullable = false)
    private String propertyType;

    private String grossSqFt;
    private String numberOfUnits;
    private String yearBuilt;
    private String physicalOccupancyPct;
    private String economicOccupancyPct;
    private String latitude;
    private String longitude;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStreetAddress() { return streetAddress; }
    public void setStreetAddress(String streetAddress) { this.streetAddress = streetAddress; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }
    public String getGrossSqFt() { return grossSqFt; }
    public void setGrossSqFt(String grossSqFt) { this.grossSqFt = grossSqFt; }
    public String getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(String numberOfUnits) { this.numberOfUnits = numberOfUnits; }
    public String getYearBuilt() { return yearBuilt; }
    public void setYearBuilt(String yearBuilt) { this.yearBuilt = yearBuilt; }
    public String getPhysicalOccupancyPct() { return physicalOccupancyPct; }
    public void setPhysicalOccupancyPct(String physicalOccupancyPct) { this.physicalOccupancyPct = physicalOccupancyPct; }
    public String getEconomicOccupancyPct() { return economicOccupancyPct; }
    public void setEconomicOccupancyPct(String economicOccupancyPct) { this.economicOccupancyPct = economicOccupancyPct; }
    public String getLatitude() { return latitude; }
    public void setLatitude(String latitude) { this.latitude = latitude; }
    public String getLongitude() { return longitude; }
    public void setLongitude(String longitude) { this.longitude = longitude; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
