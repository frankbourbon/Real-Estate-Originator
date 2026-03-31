package com.cre.loan.controller;

import com.cre.loan.service.PropertyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/properties")
public class PropertyController {

    private final PropertyService svc;

    public PropertyController(PropertyService svc) { this.svc = svc; }

    @GetMapping
    public ResponseEntity<?> list(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String propertyType) {
        return ResponseEntity.ok(svc.findAll(search, propertyType));
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
