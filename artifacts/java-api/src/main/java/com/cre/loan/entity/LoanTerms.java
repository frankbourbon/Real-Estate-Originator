package com.cre.loan.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "loan_terms")
public class LoanTerms {

    @Id
    private String applicationId;

    private String rateType;
    private String baseRate;
    private String fixedRateVariance;
    private String indexName;
    private String indexRate;
    private String spreadOnFixed;
    private String allInFixedRate;
    private String adjustableRateVariance;
    private String adjustableIndexName;
    private String adjustableIndexRate;
    private String spreadOnAdjustable;
    private String proformaAdjustableAllInRate;
    private String loanAmountUsd;
    private String loanTermYears;
    private String amortizationYears;
    private String amortizationType;
    private String ltvPct;
    private String dscrRatio;
    private String targetClosingDate;
    private String interestOnlyPeriodMonths;
    private String prepaymentPenaltyPct;
    private String originationFeePct;
    private String ecoaNoticeDate;
    private String ecoaActionTaken;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() { updatedAt = Instant.now(); }

    public String getApplicationId() { return applicationId; }
    public void setApplicationId(String applicationId) { this.applicationId = applicationId; }
    public String getRateType() { return rateType; }
    public void setRateType(String rateType) { this.rateType = rateType; }
    public String getBaseRate() { return baseRate; }
    public void setBaseRate(String baseRate) { this.baseRate = baseRate; }
    public String getFixedRateVariance() { return fixedRateVariance; }
    public void setFixedRateVariance(String fixedRateVariance) { this.fixedRateVariance = fixedRateVariance; }
    public String getIndexName() { return indexName; }
    public void setIndexName(String indexName) { this.indexName = indexName; }
    public String getIndexRate() { return indexRate; }
    public void setIndexRate(String indexRate) { this.indexRate = indexRate; }
    public String getSpreadOnFixed() { return spreadOnFixed; }
    public void setSpreadOnFixed(String spreadOnFixed) { this.spreadOnFixed = spreadOnFixed; }
    public String getAllInFixedRate() { return allInFixedRate; }
    public void setAllInFixedRate(String allInFixedRate) { this.allInFixedRate = allInFixedRate; }
    public String getAdjustableRateVariance() { return adjustableRateVariance; }
    public void setAdjustableRateVariance(String adjustableRateVariance) { this.adjustableRateVariance = adjustableRateVariance; }
    public String getAdjustableIndexName() { return adjustableIndexName; }
    public void setAdjustableIndexName(String adjustableIndexName) { this.adjustableIndexName = adjustableIndexName; }
    public String getAdjustableIndexRate() { return adjustableIndexRate; }
    public void setAdjustableIndexRate(String adjustableIndexRate) { this.adjustableIndexRate = adjustableIndexRate; }
    public String getSpreadOnAdjustable() { return spreadOnAdjustable; }
    public void setSpreadOnAdjustable(String spreadOnAdjustable) { this.spreadOnAdjustable = spreadOnAdjustable; }
    public String getProformaAdjustableAllInRate() { return proformaAdjustableAllInRate; }
    public void setProformaAdjustableAllInRate(String proformaAdjustableAllInRate) { this.proformaAdjustableAllInRate = proformaAdjustableAllInRate; }
    public String getLoanAmountUsd() { return loanAmountUsd; }
    public void setLoanAmountUsd(String loanAmountUsd) { this.loanAmountUsd = loanAmountUsd; }
    public String getLoanTermYears() { return loanTermYears; }
    public void setLoanTermYears(String loanTermYears) { this.loanTermYears = loanTermYears; }
    public String getAmortizationYears() { return amortizationYears; }
    public void setAmortizationYears(String amortizationYears) { this.amortizationYears = amortizationYears; }
    public String getAmortizationType() { return amortizationType; }
    public void setAmortizationType(String amortizationType) { this.amortizationType = amortizationType; }
    public String getLtvPct() { return ltvPct; }
    public void setLtvPct(String ltvPct) { this.ltvPct = ltvPct; }
    public String getDscrRatio() { return dscrRatio; }
    public void setDscrRatio(String dscrRatio) { this.dscrRatio = dscrRatio; }
    public String getTargetClosingDate() { return targetClosingDate; }
    public void setTargetClosingDate(String targetClosingDate) { this.targetClosingDate = targetClosingDate; }
    public String getInterestOnlyPeriodMonths() { return interestOnlyPeriodMonths; }
    public void setInterestOnlyPeriodMonths(String interestOnlyPeriodMonths) { this.interestOnlyPeriodMonths = interestOnlyPeriodMonths; }
    public String getPrepaymentPenaltyPct() { return prepaymentPenaltyPct; }
    public void setPrepaymentPenaltyPct(String prepaymentPenaltyPct) { this.prepaymentPenaltyPct = prepaymentPenaltyPct; }
    public String getOriginationFeePct() { return originationFeePct; }
    public void setOriginationFeePct(String originationFeePct) { this.originationFeePct = originationFeePct; }
    public String getEcoaNoticeDate() { return ecoaNoticeDate; }
    public void setEcoaNoticeDate(String ecoaNoticeDate) { this.ecoaNoticeDate = ecoaNoticeDate; }
    public String getEcoaActionTaken() { return ecoaActionTaken; }
    public void setEcoaActionTaken(String ecoaActionTaken) { this.ecoaActionTaken = ecoaActionTaken; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
