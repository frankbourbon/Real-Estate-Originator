package com.cre.loan.service;

import com.cre.loan.entity.*;
import com.cre.loan.repository.*;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LoanApplicationService {

    private static final List<String> WORKFLOW = List.of(
        "Inquiry", "Initial Credit Review", "Application Start",
        "Application Processing", "Final Credit Review", "Pre-close",
        "Ready for Docs", "Docs Drawn", "Docs Back", "Closing"
    );

    private final LoanApplicationRepository appRepo;
    private final ActivityLogRepository logRepo;

    public LoanApplicationService(LoanApplicationRepository appRepo, ActivityLogRepository logRepo) {
        this.appRepo = appRepo;
        this.logRepo = logRepo;
    }

    public List<LoanApplication> findAll(String status, String phase, String search, String rateType) {
        List<LoanApplication> all = appRepo.findAll();
        if (status != null && !status.isBlank()) {
            all = all.stream().filter(a -> status.equals(a.getStatus())).collect(Collectors.toList());
        }
        if (phase != null && !phase.isBlank()) {
            List<String> phaseStatuses = getStatusesForPhase(phase);
            all = all.stream().filter(a -> phaseStatuses.contains(a.getStatus())).collect(Collectors.toList());
        }
        if (rateType != null && !rateType.isBlank()) {
            all = all.stream().filter(a -> rateType.equals(a.getRateType())).collect(Collectors.toList());
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            all = all.stream().filter(a ->
                (a.getLoanType() != null && a.getLoanType().toLowerCase().contains(q)) ||
                (a.getStatus() != null && a.getStatus().toLowerCase().contains(q)) ||
                (a.getBorrowerId() != null && a.getBorrowerId().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }
        all.sort(Comparator.comparing(LoanApplication::getUpdatedAt).reversed());
        return all;
    }

    public Optional<LoanApplication> findById(String id) {
        return appRepo.findById(id);
    }

    public LoanApplication create(Map<String, Object> body) {
        LoanApplication a = new LoanApplication();
        a.setId(UUID.randomUUID().toString());
        a.setStatus("Inquiry");
        applyFields(a, body);
        LoanApplication saved = appRepo.save(a);
        logActivity(saved.getId(), "CREATED", "Application created", "System");
        return saved;
    }

    public Optional<LoanApplication> update(String id, Map<String, Object> body) {
        return appRepo.findById(id).map(a -> {
            applyFields(a, body);
            LoanApplication saved = appRepo.save(a);
            logActivity(id, "UPDATED", "Application updated", "System");
            return saved;
        });
    }

    public Optional<LoanApplication> advanceStatus(String id, String nextStatus) {
        return appRepo.findById(id).map(a -> {
            String prev = a.getStatus();
            a.setStatus(nextStatus);
            LoanApplication saved = appRepo.save(a);
            logActivity(id, "STATUS_CHANGE", prev + " → " + nextStatus, "System");
            return saved;
        });
    }

    public boolean delete(String id) {
        if (!appRepo.existsById(id)) return false;
        appRepo.deleteById(id);
        return true;
    }

    private void logActivity(String appId, String action, String desc, String user) {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID().toString());
        log.setApplicationId(appId);
        log.setAction(action);
        log.setDescription(desc);
        log.setUserName(user);
        logRepo.save(log);
    }

    private List<String> getStatusesForPhase(String phase) {
        return switch (phase) {
            case "Inquiry"   -> List.of("Inquiry");
            case "ICR"       -> List.of("Initial Credit Review");
            case "Application" -> List.of("Application Start", "Application Processing");
            case "FCR"       -> List.of("Final Credit Review");
            case "Closing"   -> List.of("Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing");
            case "Disposed"  -> List.of("Inquiry Canceled", "Inquiry Withdrawn", "Inquiry Denied",
                                        "Application Withdrawn", "Application Canceled", "Application Denied");
            default -> List.of();
        };
    }

    private void applyFields(LoanApplication a, Map<String, Object> body) {
        if (body.containsKey("borrowerId")) a.setBorrowerId((String) body.get("borrowerId"));
        if (body.containsKey("propertyId")) a.setPropertyId((String) body.get("propertyId"));
        if (body.containsKey("loanType")) a.setLoanType((String) body.get("loanType"));
        if (body.containsKey("loanAmountUsd")) a.setLoanAmountUsd((String) body.get("loanAmountUsd"));
        if (body.containsKey("loanTermYears")) a.setLoanTermYears((String) body.get("loanTermYears"));
        if (body.containsKey("interestType")) a.setInterestType((String) body.get("interestType"));
        if (body.containsKey("interestRatePct")) a.setInterestRatePct((String) body.get("interestRatePct"));
        if (body.containsKey("amortizationType")) a.setAmortizationType((String) body.get("amortizationType"));
        if (body.containsKey("ltvPct")) a.setLtvPct((String) body.get("ltvPct"));
        if (body.containsKey("dscrRatio")) a.setDscrRatio((String) body.get("dscrRatio"));
        if (body.containsKey("status")) a.setStatus((String) body.get("status"));
        if (body.containsKey("rateType")) a.setRateType((String) body.get("rateType"));
        if (body.containsKey("allInFixedRate")) a.setAllInFixedRate((String) body.get("allInFixedRate"));
        if (body.containsKey("proformaAdjustableAllInRate")) a.setProformaAdjustableAllInRate((String) body.get("proformaAdjustableAllInRate"));
        if (body.containsKey("targetClosingDate") && body.get("targetClosingDate") != null) {
            a.setTargetClosingDate(LocalDate.parse((String) body.get("targetClosingDate")));
        }
    }
}
