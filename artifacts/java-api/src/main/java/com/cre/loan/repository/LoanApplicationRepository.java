package com.cre.loan.repository;

import com.cre.loan.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface LoanApplicationRepository extends JpaRepository<LoanApplication, String> {
    List<LoanApplication> findByStatus(String status);
    List<LoanApplication> findByBorrowerId(String borrowerId);
    List<LoanApplication> findByPropertyId(String propertyId);

    @Query("SELECT a FROM LoanApplication a WHERE a.status IN :statuses")
    List<LoanApplication> findByStatusIn(@Param("statuses") List<String> statuses);
}
