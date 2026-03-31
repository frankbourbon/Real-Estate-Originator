package com.cre.loan.repository;

import com.cre.loan.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, String> {
    List<Property> findByPropertyType(String propertyType);

    @Query("SELECT p FROM Property p WHERE LOWER(p.streetAddress) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(p.city) LIKE LOWER(CONCAT('%',:q,'%'))")
    List<Property> search(@Param("q") String q);
}
