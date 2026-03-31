package com.cre.loan.service;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class CalculatorService {

    public Map<String, Object> amortize(double loanAmount, double annualRatePct,
                                        int termMonths, int amortizationMonths, int ioMonths) {
        double monthlyRate = annualRatePct / 100.0 / 12.0;
        int amortMonths = amortizationMonths > 0 ? amortizationMonths : termMonths;
        int ioM = Math.min(ioMonths, termMonths);

        double fullPayment = monthlyRate == 0 ? loanAmount / amortMonths
            : loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, amortMonths))
              / (Math.pow(1 + monthlyRate, amortMonths) - 1);

        double ioPayment = loanAmount * monthlyRate;
        double balance = loanAmount;
        double totalInterest = 0;
        double totalPaid = 0;

        List<Map<String, Object>> schedule = new ArrayList<>();

        for (int p = 1; p <= termMonths; p++) {
            double interest = balance * monthlyRate;
            double payment, principal;
            if (p <= ioM) {
                payment = ioPayment;
                principal = 0;
            } else {
                payment = fullPayment;
                principal = Math.min(payment - interest, balance);
                if (principal < 0) principal = 0;
            }
            balance = Math.max(0, balance - principal);
            totalInterest += interest;
            totalPaid += payment;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("period", p);
            row.put("payment", round2(payment));
            row.put("principal", round2(principal));
            row.put("interest", round2(interest));
            row.put("balance", round2(balance));
            schedule.add(row);
        }

        double balloonPayment = balance;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monthlyPayment", round2(fullPayment));
        result.put("totalInterest", round2(totalInterest));
        result.put("totalPaid", round2(totalPaid));
        result.put("balloonPayment", round2(balloonPayment));
        result.put("schedule", schedule);
        return result;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
