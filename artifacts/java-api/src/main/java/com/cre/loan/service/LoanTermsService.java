package com.cre.loan.service;

import com.cre.loan.entity.LoanTerms;
import com.cre.loan.repository.LoanTermsRepository;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Optional;

@Service
public class LoanTermsService {

    private final LoanTermsRepository repo;

    public LoanTermsService(LoanTermsRepository repo) {
        this.repo = repo;
    }

    public Optional<LoanTerms> findByApplicationId(String applicationId) {
        return repo.findById(applicationId);
    }

    public LoanTerms upsert(String applicationId, Map<String, Object> body) {
        LoanTerms lt = repo.findById(applicationId).orElseGet(() -> {
            LoanTerms n = new LoanTerms();
            n.setApplicationId(applicationId);
            return n;
        });
        applyFields(lt, body);
        return repo.save(lt);
    }

    private void applyFields(LoanTerms lt, Map<String, Object> body) {
        if (body.containsKey("rateType")) lt.setRateType((String) body.get("rateType"));
        if (body.containsKey("baseRate")) lt.setBaseRate((String) body.get("baseRate"));
        if (body.containsKey("fixedRateVariance")) lt.setFixedRateVariance((String) body.get("fixedRateVariance"));
        if (body.containsKey("indexName")) lt.setIndexName((String) body.get("indexName"));
        if (body.containsKey("indexRate")) lt.setIndexRate((String) body.get("indexRate"));
        if (body.containsKey("spreadOnFixed")) lt.setSpreadOnFixed((String) body.get("spreadOnFixed"));
        if (body.containsKey("allInFixedRate")) lt.setAllInFixedRate((String) body.get("allInFixedRate"));
        if (body.containsKey("adjustableRateVariance")) lt.setAdjustableRateVariance((String) body.get("adjustableRateVariance"));
        if (body.containsKey("adjustableIndexName")) lt.setAdjustableIndexName((String) body.get("adjustableIndexName"));
        if (body.containsKey("adjustableIndexRate")) lt.setAdjustableIndexRate((String) body.get("adjustableIndexRate"));
        if (body.containsKey("spreadOnAdjustable")) lt.setSpreadOnAdjustable((String) body.get("spreadOnAdjustable"));
        if (body.containsKey("proformaAdjustableAllInRate")) lt.setProformaAdjustableAllInRate((String) body.get("proformaAdjustableAllInRate"));
        if (body.containsKey("loanAmountUsd")) lt.setLoanAmountUsd((String) body.get("loanAmountUsd"));
        if (body.containsKey("loanTermYears")) lt.setLoanTermYears((String) body.get("loanTermYears"));
        if (body.containsKey("amortizationYears")) lt.setAmortizationYears((String) body.get("amortizationYears"));
        if (body.containsKey("amortizationType")) lt.setAmortizationType((String) body.get("amortizationType"));
        if (body.containsKey("ltvPct")) lt.setLtvPct((String) body.get("ltvPct"));
        if (body.containsKey("dscrRatio")) lt.setDscrRatio((String) body.get("dscrRatio"));
        if (body.containsKey("targetClosingDate")) lt.setTargetClosingDate((String) body.get("targetClosingDate"));
        if (body.containsKey("interestOnlyPeriodMonths")) lt.setInterestOnlyPeriodMonths((String) body.get("interestOnlyPeriodMonths"));
        if (body.containsKey("prepaymentPenaltyPct")) lt.setPrepaymentPenaltyPct((String) body.get("prepaymentPenaltyPct"));
        if (body.containsKey("originationFeePct")) lt.setOriginationFeePct((String) body.get("originationFeePct"));
        if (body.containsKey("ecoaNoticeDate")) lt.setEcoaNoticeDate((String) body.get("ecoaNoticeDate"));
        if (body.containsKey("ecoaActionTaken")) lt.setEcoaActionTaken((String) body.get("ecoaActionTaken"));
    }
}
