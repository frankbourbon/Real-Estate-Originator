package com.cre.loan.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {

    @Id
    private String id;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String borrowerId;

    @Column(nullable = false)
    private String propertyId;

    private String loanType;
    private String loanAmountUsd;
    private String loanTermYears;
    private String interestType;
    private String interestRatePct;
    private String amortizationType;
    private String ltvPct;
    private String dscrRatio;
    private LocalDate targetClosingDate;
    private String rateType;
    private String allInFixedRate;
    private String proformaAdjustableAllInRate;

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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBorrowerId() { return borrowerId; }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }
    public String getLoanType() { return loanType; }
    public void setLoanType(String loanType) { this.loanType = loanType; }
    public String getLoanAmountUsd() { return loanAmountUsd; }
    public void setLoanAmountUsd(String loanAmountUsd) { this.loanAmountUsd = loanAmountUsd; }
    public String getLoanTermYears() { return loanTermYears; }
    public void setLoanTermYears(String loanTermYears) { this.loanTermYears = loanTermYears; }
    public String getInterestType() { return interestType; }
    public void setInterestType(String interestType) { this.interestType = interestType; }
    public String getInterestRatePct() { return interestRatePct; }
    public void setInterestRatePct(String interestRatePct) { this.interestRatePct = interestRatePct; }
    public String getAmortizationType() { return amortizationType; }
    public void setAmortizationType(String amortizationType) { this.amortizationType = amortizationType; }
    public String getLtvPct() { return ltvPct; }
    public void setLtvPct(String ltvPct) { this.ltvPct = ltvPct; }
    public String getDscrRatio() { return dscrRatio; }
    public void setDscrRatio(String dscrRatio) { this.dscrRatio = dscrRatio; }
    public LocalDate getTargetClosingDate() { return targetClosingDate; }
    public void setTargetClosingDate(LocalDate targetClosingDate) { this.targetClosingDate = targetClosingDate; }
    public String getRateType() { return rateType; }
    public void setRateType(String rateType) { this.rateType = rateType; }
    public String getAllInFixedRate() { return allInFixedRate; }
    public void setAllInFixedRate(String allInFixedRate) { this.allInFixedRate = allInFixedRate; }
    public String getProformaAdjustableAllInRate() { return proformaAdjustableAllInRate; }
    public void setProformaAdjustableAllInRate(String proformaAdjustableAllInRate) { this.proformaAdjustableAllInRate = proformaAdjustableAllInRate; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
