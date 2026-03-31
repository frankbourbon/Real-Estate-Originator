package com.cre.loan.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "borrowers")
public class Borrower {

    @Id
    private String id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String entityName;
    private String email;
    private String phone;
    private String mailingAddress;
    private String city;
    private String state;
    private String zipCode;
    private String creExperienceYears;
    private String netWorthUsd;
    private String liquidityUsd;
    private String creditScore;

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
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEntityName() { return entityName; }
    public void setEntityName(String entityName) { this.entityName = entityName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getMailingAddress() { return mailingAddress; }
    public void setMailingAddress(String mailingAddress) { this.mailingAddress = mailingAddress; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public String getCreExperienceYears() { return creExperienceYears; }
    public void setCreExperienceYears(String creExperienceYears) { this.creExperienceYears = creExperienceYears; }
    public String getNetWorthUsd() { return netWorthUsd; }
    public void setNetWorthUsd(String netWorthUsd) { this.netWorthUsd = netWorthUsd; }
    public String getLiquidityUsd() { return liquidityUsd; }
    public void setLiquidityUsd(String liquidityUsd) { this.liquidityUsd = liquidityUsd; }
    public String getCreditScore() { return creditScore; }
    public void setCreditScore(String creditScore) { this.creditScore = creditScore; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
