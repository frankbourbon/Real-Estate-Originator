package com.cre.loan.repository;

import com.cre.loan.entity.LoanTerms;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanTermsRepository extends JpaRepository<LoanTerms, String> {
}
