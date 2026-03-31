package com.cre.loan.controller;

import com.cre.loan.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService svc;

    public DashboardController(DashboardService svc) { this.svc = svc; }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        return ResponseEntity.ok(svc.getSummary());
    }

    @GetMapping("/recent-activity")
    public ResponseEntity<?> recentActivity(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(svc.getRecentActivity(limit));
    }

    @GetMapping("/pipeline")
    public ResponseEntity<?> pipeline() {
        return ResponseEntity.ok(svc.getPipelineBreakdown());
    }
}
