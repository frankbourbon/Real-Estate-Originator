package com.cre.loan.service;

import com.cre.loan.entity.LoanApplication;
import com.cre.loan.repository.ActivityLogRepository;
import com.cre.loan.repository.LoanApplicationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final List<String> INQUIRY_STATUSES    = List.of("Inquiry");
    private static final List<String> REVIEW_STATUSES     = List.of("Initial Credit Review", "Application Start", "Application Processing", "Final Credit Review");
    private static final List<String> CLOSING_STATUSES    = List.of("Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing");
    private static final List<String> DISPOSED_STATUSES   = List.of("Inquiry Canceled", "Inquiry Withdrawn", "Inquiry Denied", "Application Withdrawn", "Application Canceled", "Application Denied");

    private final LoanApplicationRepository appRepo;
    private final ActivityLogRepository logRepo;

    public DashboardService(LoanApplicationRepository appRepo, ActivityLogRepository logRepo) {
        this.appRepo = appRepo;
        this.logRepo = logRepo;
    }

    public Map<String, Object> getSummary() {
        List<LoanApplication> all = appRepo.findAll();
        int total = all.size();
        double totalVolume = all.stream()
            .mapToDouble(a -> parseAmount(a.getLoanAmountUsd()))
            .sum();

        long inquiryCount = all.stream().filter(a -> INQUIRY_STATUSES.contains(a.getStatus())).count();
        long inReviewCount = all.stream().filter(a -> REVIEW_STATUSES.contains(a.getStatus())).count();
        long closingCount = all.stream().filter(a -> CLOSING_STATUSES.contains(a.getStatus())).count();
        long closedCount = all.stream().filter(a -> DISPOSED_STATUSES.contains(a.getStatus())).count();

        double avgDSCR = all.stream()
            .filter(a -> a.getDscrRatio() != null && !a.getDscrRatio().isBlank())
            .mapToDouble(a -> parseDouble(a.getDscrRatio()))
            .average().orElse(0);

        double avgLTV = all.stream()
            .filter(a -> a.getLtvPct() != null && !a.getLtvPct().isBlank())
            .mapToDouble(a -> parseDouble(a.getLtvPct()))
            .average().orElse(0);

        Map<String, Long> countByStatus = all.stream()
            .collect(Collectors.groupingBy(a -> a.getStatus() != null ? a.getStatus() : "Unknown", Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalApplications", total);
        result.put("totalLoanVolume", totalVolume);
        result.put("inquiryCount", inquiryCount);
        result.put("inReviewCount", inReviewCount);
        result.put("closingCount", closingCount);
        result.put("closedCount", closedCount);
        result.put("avgDSCR", Math.round(avgDSCR * 100.0) / 100.0);
        result.put("avgLTV", Math.round(avgLTV * 100.0) / 100.0);
        result.put("countByStatus", countByStatus);
        return result;
    }

    public List<Object> getRecentActivity(int limit) {
        return logRepo.findAllByOrderByTimestampDesc(PageRequest.of(0, limit)).stream()
            .map(log -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", log.getId());
                m.put("applicationId", log.getApplicationId());
                m.put("action", log.getAction());
                m.put("description", log.getDescription());
                m.put("userName", log.getUserName());
                m.put("timestamp", log.getTimestamp());
                return (Object) m;
            }).collect(Collectors.toList());
    }

    public List<Object> getPipelineBreakdown() {
        List<LoanApplication> all = appRepo.findAll();
        List<Map.Entry<String, List<String>>> phases = List.of(
            Map.entry("Inquiry",     List.of("Inquiry")),
            Map.entry("ICR",         List.of("Initial Credit Review")),
            Map.entry("Application", List.of("Application Start", "Application Processing")),
            Map.entry("FCR",         List.of("Final Credit Review")),
            Map.entry("Closing",     List.of("Pre-close", "Ready for Docs", "Docs Drawn", "Docs Back", "Closing")),
            Map.entry("Disposed",    List.of("Inquiry Canceled","Inquiry Withdrawn","Inquiry Denied","Application Withdrawn","Application Canceled","Application Denied"))
        );
        return phases.stream().map(entry -> {
            List<LoanApplication> apps = all.stream()
                .filter(a -> entry.getValue().contains(a.getStatus()))
                .collect(Collectors.toList());
            double vol = apps.stream().mapToDouble(a -> parseAmount(a.getLoanAmountUsd())).sum();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("phase", entry.getKey());
            m.put("count", apps.size());
            m.put("totalVolume", vol);
            return (Object) m;
        }).collect(Collectors.toList());
    }

    private double parseAmount(String s) {
        if (s == null || s.isBlank()) return 0;
        try { return Double.parseDouble(s.replaceAll("[^0-9.]", "")); } catch (Exception e) { return 0; }
    }

    private double parseDouble(String s) {
        if (s == null || s.isBlank()) return 0;
        try { return Double.parseDouble(s.replaceAll("[^0-9.]", "")); } catch (Exception e) { return 0; }
    }
}
