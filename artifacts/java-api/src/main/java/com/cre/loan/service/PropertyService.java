package com.cre.loan.service;

import com.cre.loan.entity.Property;
import com.cre.loan.repository.PropertyRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class PropertyService {

    private final PropertyRepository repo;

    public PropertyService(PropertyRepository repo) {
        this.repo = repo;
    }

    public List<Property> findAll(String search, String propertyType) {
        if (search != null && !search.isBlank()) return repo.search(search.trim());
        if (propertyType != null && !propertyType.isBlank()) return repo.findByPropertyType(propertyType);
        return repo.findAll();
    }

    public Optional<Property> findById(String id) {
        return repo.findById(id);
    }

    public Property create(Map<String, Object> body) {
        Property p = new Property();
        p.setId(UUID.randomUUID().toString());
        applyFields(p, body);
        return repo.save(p);
    }

    public Optional<Property> update(String id, Map<String, Object> body) {
        return repo.findById(id).map(p -> {
            applyFields(p, body);
            return repo.save(p);
        });
    }

    private void applyFields(Property p, Map<String, Object> body) {
        if (body.containsKey("streetAddress")) p.setStreetAddress((String) body.get("streetAddress"));
        if (body.containsKey("city")) p.setCity((String) body.get("city"));
        if (body.containsKey("state")) p.setState((String) body.get("state"));
        if (body.containsKey("zipCode")) p.setZipCode((String) body.get("zipCode"));
        if (body.containsKey("propertyType")) p.setPropertyType((String) body.get("propertyType"));
        if (body.containsKey("grossSqFt")) p.setGrossSqFt((String) body.get("grossSqFt"));
        if (body.containsKey("numberOfUnits")) p.setNumberOfUnits((String) body.get("numberOfUnits"));
        if (body.containsKey("yearBuilt")) p.setYearBuilt((String) body.get("yearBuilt"));
        if (body.containsKey("physicalOccupancyPct")) p.setPhysicalOccupancyPct((String) body.get("physicalOccupancyPct"));
        if (body.containsKey("economicOccupancyPct")) p.setEconomicOccupancyPct((String) body.get("economicOccupancyPct"));
        if (body.containsKey("latitude")) p.setLatitude((String) body.get("latitude"));
        if (body.containsKey("longitude")) p.setLongitude((String) body.get("longitude"));
    }
}
