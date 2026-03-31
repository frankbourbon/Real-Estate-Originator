package com.cre.loan.service;

import com.cre.loan.entity.Borrower;
import com.cre.loan.repository.BorrowerRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class BorrowerService {

    private final BorrowerRepository repo;

    public BorrowerService(BorrowerRepository repo) {
        this.repo = repo;
    }

    public List<Borrower> findAll(String search) {
        if (search != null && !search.isBlank()) return repo.search(search.trim());
        return repo.findAll();
    }

    public Optional<Borrower> findById(String id) {
        return repo.findById(id);
    }

    public Borrower create(Map<String, Object> body) {
        Borrower b = new Borrower();
        b.setId(UUID.randomUUID().toString());
        applyFields(b, body);
        return repo.save(b);
    }

    public Optional<Borrower> update(String id, Map<String, Object> body) {
        return repo.findById(id).map(b -> {
            applyFields(b, body);
            return repo.save(b);
        });
    }

    private void applyFields(Borrower b, Map<String, Object> body) {
        if (body.containsKey("firstName")) b.setFirstName((String) body.get("firstName"));
        if (body.containsKey("lastName")) b.setLastName((String) body.get("lastName"));
        if (body.containsKey("entityName")) b.setEntityName((String) body.get("entityName"));
        if (body.containsKey("email")) b.setEmail((String) body.get("email"));
        if (body.containsKey("phone")) b.setPhone((String) body.get("phone"));
        if (body.containsKey("mailingAddress")) b.setMailingAddress((String) body.get("mailingAddress"));
        if (body.containsKey("city")) b.setCity((String) body.get("city"));
        if (body.containsKey("state")) b.setState((String) body.get("state"));
        if (body.containsKey("zipCode")) b.setZipCode((String) body.get("zipCode"));
        if (body.containsKey("creExperienceYears")) b.setCreExperienceYears((String) body.get("creExperienceYears"));
        if (body.containsKey("netWorthUsd")) b.setNetWorthUsd((String) body.get("netWorthUsd"));
        if (body.containsKey("liquidityUsd")) b.setLiquidityUsd((String) body.get("liquidityUsd"));
        if (body.containsKey("creditScore")) b.setCreditScore((String) body.get("creditScore"));
    }
}
