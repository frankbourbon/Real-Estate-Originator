package com.cre.loan.controller;

import com.cre.loan.service.CalculatorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/calculator")
public class CalculatorController {

    private final CalculatorService svc;

    public CalculatorController(CalculatorService svc) { this.svc = svc; }

    @PostMapping("/amortize")
    public ResponseEntity<?> amortize(@RequestBody Map<String, Object> body) {
        double loanAmount = ((Number) body.get("loanAmount")).doubleValue();
        double annualRatePct = ((Number) body.get("annualRatePct")).doubleValue();
        int termMonths = ((Number) body.get("termMonths")).intValue();
        int amortizationMonths = ((Number) body.get("amortizationMonths")).intValue();
        int ioMonths = body.containsKey("interestOnlyMonths") && body.get("interestOnlyMonths") != null
            ? ((Number) body.get("interestOnlyMonths")).intValue() : 0;
        return ResponseEntity.ok(svc.amortize(loanAmount, annualRatePct, termMonths, amortizationMonths, ioMonths));
    }
}
