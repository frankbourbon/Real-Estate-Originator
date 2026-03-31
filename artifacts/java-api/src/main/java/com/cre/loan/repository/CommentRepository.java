package com.cre.loan.repository;

import com.cre.loan.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, String> {
    List<Comment> findByApplicationIdOrderByCreatedAtAsc(String applicationId);
}
