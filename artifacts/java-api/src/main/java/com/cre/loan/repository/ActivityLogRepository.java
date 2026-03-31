package com.cre.loan.repository;

import com.cre.loan.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, String> {
    List<ActivityLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
