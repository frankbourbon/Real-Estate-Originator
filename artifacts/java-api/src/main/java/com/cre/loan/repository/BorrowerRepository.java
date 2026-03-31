package com.cre.loan.repository;

import com.cre.loan.entity.Borrower;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BorrowerRepository extends JpaRepository<Borrower, String> {
    @Query("SELECT b FROM Borrower b WHERE LOWER(b.firstName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(b.lastName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(b.entityName) LIKE LOWER(CONCAT('%',:q,'%'))")
    List<Borrower> search(@Param("q") String q);
}
