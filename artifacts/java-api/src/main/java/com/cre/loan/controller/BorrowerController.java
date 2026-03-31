package com.cre.loan.controller;

import com.cre.loan.service.BorrowerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/borrowers")
public class BorrowerController {

    private final BorrowerService svc;

    public BorrowerController(BorrowerService svc) { this.svc = svc; }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(svc.findAll(search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return svc.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(201).body(svc.create(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return svc.update(id, body)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
