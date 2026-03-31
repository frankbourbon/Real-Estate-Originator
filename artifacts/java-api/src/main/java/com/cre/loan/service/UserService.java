package com.cre.loan.service;

import com.cre.loan.entity.AppUser;
import com.cre.loan.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class UserService {

    private final AppUserRepository repo;

    public UserService(AppUserRepository repo) {
        this.repo = repo;
    }

    public List<AppUser> findAll() {
        return repo.findAll();
    }

    public Optional<AppUser> findById(String id) {
        return repo.findById(id);
    }

    public AppUser create(Map<String, Object> body) {
        AppUser u = new AppUser();
        u.setId(UUID.randomUUID().toString());
        applyFields(u, body);
        return repo.save(u);
    }

    public Optional<AppUser> update(String id, Map<String, Object> body) {
        return repo.findById(id).map(u -> {
            applyFields(u, body);
            return repo.save(u);
        });
    }

    private void applyFields(AppUser u, Map<String, Object> body) {
        if (body.containsKey("sid")) u.setSid((String) body.get("sid"));
        if (body.containsKey("firstName")) u.setFirstName((String) body.get("firstName"));
        if (body.containsKey("lastName")) u.setLastName((String) body.get("lastName"));
        if (body.containsKey("email")) u.setEmail((String) body.get("email"));
        if (body.containsKey("role")) u.setRole((String) body.get("role"));
        if (body.containsKey("department")) u.setDepartment((String) body.get("department"));
        if (body.containsKey("active")) u.setActive(Boolean.TRUE.equals(body.get("active")));
    }
}
