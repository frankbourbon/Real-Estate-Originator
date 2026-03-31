package com.cre.loan.repository;

import com.cre.loan.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByApplicationIdOrderByUploadedAtDesc(String applicationId);
}
