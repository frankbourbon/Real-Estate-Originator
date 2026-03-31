package com.cre.loan.controller;

import com.cre.loan.entity.*;
import com.cre.loan.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/applications")
public class ApplicationController {

    private final LoanApplicationService appSvc;
    private final BorrowerService borrowerSvc;
    private final PropertyService propertySvc;
    private final LoanTermsService termsSvc;
    private final CommentService commentSvc;
    private final DocumentService documentSvc;

    public ApplicationController(LoanApplicationService appSvc, BorrowerService borrowerSvc,
                                  PropertyService propertySvc, LoanTermsService termsSvc,
                                  CommentService commentSvc, DocumentService documentSvc) {
        this.appSvc = appSvc;
        this.borrowerSvc = borrowerSvc;
        this.propertySvc = propertySvc;
        this.termsSvc = termsSvc;
        this.commentSvc = commentSvc;
        this.documentSvc = documentSvc;
    }

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String phase,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String rateType) {
        List<LoanApplication> apps = appSvc.findAll(status, phase, search, rateType);
        // Enrich with borrower/property display fields
        List<Map<String, Object>> result = new ArrayList<>();
        for (LoanApplication a : apps) {
            Map<String, Object> m = toMap(a);
            borrowerSvc.findById(a.getBorrowerId()).ifPresent(b -> {
                m.put("borrowerName", b.getFirstName() + " " + b.getLastName());
                m.put("entityName", b.getEntityName());
            });
            propertySvc.findById(a.getPropertyId()).ifPresent(p -> {
                m.put("propertyAddress", p.getStreetAddress());
                m.put("propertyCity", p.getCity());
                m.put("propertyState", p.getState());
                m.put("propertyType", p.getPropertyType());
            });
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDetail(@PathVariable String id) {
        return appSvc.findById(id).map(a -> {
            Map<String, Object> m = toMap(a);
            borrowerSvc.findById(a.getBorrowerId()).ifPresent(b -> m.put("borrower", b));
            propertySvc.findById(a.getPropertyId()).ifPresent(p -> m.put("property", p));
            termsSvc.findByApplicationId(id).ifPresent(t -> m.put("loanTerms", t));
            m.put("commentCount", commentSvc.findAllFlatByApplicationId(id).size());
            m.put("documentCount", documentSvc.findByApplicationId(id).size());
            // Enrich display fields
            if (m.containsKey("borrower")) {
                Borrower b = (Borrower) m.get("borrower");
                m.put("borrowerName", b.getFirstName() + " " + b.getLastName());
                m.put("entityName", b.getEntityName());
            }
            if (m.containsKey("property")) {
                Property p = (Property) m.get("property");
                m.put("propertyAddress", p.getStreetAddress());
                m.put("propertyCity", p.getCity());
                m.put("propertyState", p.getState());
                m.put("propertyType", p.getPropertyType());
            }
            return ResponseEntity.ok((Object) m);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(appSvc.create(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return appSvc.update(id, body)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        return appSvc.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/advance-status")
    public ResponseEntity<?> advanceStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String nextStatus = (String) body.get("nextStatus");
        return appSvc.advanceStatus(id, nextStatus)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Loan Terms ──────────────────────────────────────────────────────────
    @GetMapping("/{id}/loan-terms")
    public ResponseEntity<?> getLoanTerms(@PathVariable String id) {
        Optional<LoanTerms> terms = termsSvc.findByApplicationId(id);
        if (terms.isPresent()) return ResponseEntity.ok(terms.get());
        return ResponseEntity.ok(Map.of("applicationId", id));
    }

    @PutMapping("/{id}/loan-terms")
    public ResponseEntity<?> updateLoanTerms(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(termsSvc.upsert(id, body));
    }

    // ── Comments ─────────────────────────────────────────────────────────────
    @GetMapping("/{id}/comments")
    public ResponseEntity<?> listComments(@PathVariable String id) {
        return ResponseEntity.ok(commentSvc.findByApplicationId(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> createComment(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(commentSvc.create(id, body));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable String id, @PathVariable String commentId) {
        return commentSvc.delete(commentId) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── Documents ────────────────────────────────────────────────────────────
    @GetMapping("/{id}/documents")
    public ResponseEntity<?> listDocuments(@PathVariable String id) {
        return ResponseEntity.ok(documentSvc.findByApplicationId(id));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<?> uploadDocument(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(documentSvc.create(id, body));
    }

    @DeleteMapping("/{id}/documents/{docId}")
    public ResponseEntity<?> deleteDocument(@PathVariable String id, @PathVariable String docId) {
        return documentSvc.delete(docId) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    private Map<String, Object> toMap(LoanApplication a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("status", a.getStatus());
        m.put("borrowerId", a.getBorrowerId());
        m.put("propertyId", a.getPropertyId());
        m.put("loanType", a.getLoanType());
        m.put("loanAmountUsd", a.getLoanAmountUsd());
        m.put("loanTermYears", a.getLoanTermYears());
        m.put("interestType", a.getInterestType());
        m.put("interestRatePct", a.getInterestRatePct());
        m.put("amortizationType", a.getAmortizationType());
        m.put("ltvPct", a.getLtvPct());
        m.put("dscrRatio", a.getDscrRatio());
        m.put("targetClosingDate", a.getTargetClosingDate());
        m.put("rateType", a.getRateType());
        m.put("allInFixedRate", a.getAllInFixedRate());
        m.put("proformaAdjustableAllInRate", a.getProformaAdjustableAllInRate());
        m.put("createdAt", a.getCreatedAt());
        m.put("updatedAt", a.getUpdatedAt());
        return m;
    }
}
