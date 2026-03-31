package com.cre.loan.service;

import com.cre.loan.entity.Document;
import com.cre.loan.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DocumentService {

    private final DocumentRepository repo;

    public DocumentService(DocumentRepository repo) {
        this.repo = repo;
    }

    public List<Document> findByApplicationId(String applicationId) {
        return repo.findByApplicationIdOrderByUploadedAtDesc(applicationId);
    }

    public Document create(String applicationId, Map<String, Object> body) {
        Document d = new Document();
        d.setId(UUID.randomUUID().toString());
        d.setApplicationId(applicationId);
        d.setFileName((String) body.getOrDefault("fileName", "untitled"));
        d.setFileType((String) body.getOrDefault("fileType", "application/octet-stream"));
        d.setCategory((String) body.get("category"));
        d.setUploadedBy((String) body.getOrDefault("uploadedBy", "System"));
        d.setDescription((String) body.get("description"));
        if (body.containsKey("fileSizeBytes") && body.get("fileSizeBytes") != null) {
            d.setFileSizeBytes(((Number) body.get("fileSizeBytes")).longValue());
        }
        return repo.save(d);
    }

    public boolean delete(String docId) {
        if (!repo.existsById(docId)) return false;
        repo.deleteById(docId);
        return true;
    }
}
