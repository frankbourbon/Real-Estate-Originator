package com.cre.loan.service;

import com.cre.loan.entity.Comment;
import com.cre.loan.repository.CommentRepository;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository repo;

    public CommentService(CommentRepository repo) {
        this.repo = repo;
    }

    public List<Comment> findByApplicationId(String applicationId) {
        List<Comment> all = repo.findByApplicationIdOrderByCreatedAtAsc(applicationId);
        // Build thread tree — top-level comments get their replies attached
        Map<String, Comment> byId = new LinkedHashMap<>();
        for (Comment c : all) byId.put(c.getId(), c);
        // Return only root comments; replies are nested via getReplies()
        return all.stream()
            .filter(c -> c.getParentCommentId() == null)
            .collect(Collectors.toList());
    }

    public List<Comment> findAllFlatByApplicationId(String applicationId) {
        return repo.findByApplicationIdOrderByCreatedAtAsc(applicationId);
    }

    public Comment create(String applicationId, Map<String, Object> body) {
        Comment c = new Comment();
        c.setId(UUID.randomUUID().toString());
        c.setApplicationId(applicationId);
        c.setBody((String) body.get("body"));
        c.setAuthorName((String) body.getOrDefault("authorName", "Anonymous"));
        c.setAuthorSid((String) body.get("authorSid"));
        c.setParentCommentId((String) body.get("parentCommentId"));
        return repo.save(c);
    }

    public boolean delete(String commentId) {
        if (!repo.existsById(commentId)) return false;
        repo.deleteById(commentId);
        return true;
    }
}
