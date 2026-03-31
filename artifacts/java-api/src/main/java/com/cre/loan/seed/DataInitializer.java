package com.cre.loan.seed;

import com.cre.loan.entity.*;
import com.cre.loan.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final BorrowerRepository borrowerRepo;
    private final PropertyRepository propertyRepo;
    private final LoanApplicationRepository appRepo;
    private final LoanTermsRepository termsRepo;
    private final AppUserRepository userRepo;
    private final ActivityLogRepository logRepo;
    private final CommentRepository commentRepo;
    private final DocumentRepository documentRepo;

    public DataInitializer(BorrowerRepository borrowerRepo, PropertyRepository propertyRepo,
                           LoanApplicationRepository appRepo, LoanTermsRepository termsRepo,
                           AppUserRepository userRepo, ActivityLogRepository logRepo,
                           CommentRepository commentRepo, DocumentRepository documentRepo) {
        this.borrowerRepo = borrowerRepo;
        this.propertyRepo = propertyRepo;
        this.appRepo = appRepo;
        this.termsRepo = termsRepo;
        this.userRepo = userRepo;
        this.logRepo = logRepo;
        this.commentRepo = commentRepo;
        this.documentRepo = documentRepo;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (appRepo.count() > 0) {
            log.info("Seed data already present — skipping.");
            return;
        }

        log.info("Seeding CRE Loan Origination data...");

        // ── Borrower ────────────────────────────────────────────────────────
        Borrower borrower = new Borrower();
        borrower.setId("seed_b01");
        borrower.setFirstName("Evelyn");
        borrower.setLastName("Carter");
        borrower.setEntityName("Carter Development Corporation");
        borrower.setEmail("e.carter@carterdevelopment.com");
        borrower.setPhone("(215) 555-0142");
        borrower.setMailingAddress("1200 Market Street");
        borrower.setCity("Philadelphia");
        borrower.setState("PA");
        borrower.setZipCode("19107");
        borrower.setCreExperienceYears("22");
        borrower.setNetWorthUsd("18,500,000");
        borrower.setLiquidityUsd("3,200,000");
        borrower.setCreditScore("762");
        borrowerRepo.save(borrower);

        // ── Additional sample borrowers ─────────────────────────────────────
        Borrower b2 = new Borrower();
        b2.setId("seed_b02");
        b2.setFirstName("Marcus");
        b2.setLastName("Whitfield");
        b2.setEntityName("Whitfield Capital Partners LLC");
        b2.setEmail("m.whitfield@whitfieldcapital.com");
        b2.setPhone("(212) 555-0271");
        b2.setMailingAddress("350 Park Avenue");
        b2.setCity("New York");
        b2.setState("NY");
        b2.setZipCode("10022");
        b2.setCreExperienceYears("15");
        b2.setNetWorthUsd("32,000,000");
        b2.setLiquidityUsd("6,500,000");
        b2.setCreditScore("748");
        borrowerRepo.save(b2);

        Borrower b3 = new Borrower();
        b3.setId("seed_b03");
        b3.setFirstName("Priya");
        b3.setLastName("Mehta");
        b3.setEntityName("Mehta Commercial Realty LLC");
        b3.setEmail("priya@mehtacommercial.com");
        b3.setPhone("(312) 555-0388");
        b3.setMailingAddress("225 W Wacker Drive");
        b3.setCity("Chicago");
        b3.setState("IL");
        b3.setZipCode("60606");
        b3.setCreExperienceYears("9");
        b3.setNetWorthUsd("8,200,000");
        b3.setLiquidityUsd("1,400,000");
        b3.setCreditScore("731");
        borrowerRepo.save(b3);

        // ── Properties ──────────────────────────────────────────────────────
        Property prop = new Property();
        prop.setId("seed_p01");
        prop.setStreetAddress("1200 Market Street");
        prop.setCity("Philadelphia");
        prop.setState("PA");
        prop.setZipCode("19107");
        prop.setPropertyType("Office");
        prop.setGrossSqFt("42,000");
        prop.setYearBuilt("2008");
        prop.setPhysicalOccupancyPct("91");
        prop.setEconomicOccupancyPct("88");
        prop.setLatitude("39.9526");
        prop.setLongitude("-75.1652");
        propertyRepo.save(prop);

        Property p2 = new Property();
        p2.setId("seed_p02");
        p2.setStreetAddress("350 Park Avenue");
        p2.setCity("New York");
        p2.setState("NY");
        p2.setZipCode("10022");
        p2.setPropertyType("Mixed Use");
        p2.setGrossSqFt("68,000");
        p2.setNumberOfUnits("12");
        p2.setYearBuilt("2001");
        p2.setPhysicalOccupancyPct("95");
        p2.setEconomicOccupancyPct("93");
        propertyRepo.save(p2);

        Property p3 = new Property();
        p3.setId("seed_p03");
        p3.setStreetAddress("225 W Wacker Drive");
        p3.setCity("Chicago");
        p3.setState("IL");
        p3.setZipCode("60606");
        p3.setPropertyType("Industrial");
        p3.setGrossSqFt("120,000");
        p3.setYearBuilt("1995");
        p3.setPhysicalOccupancyPct("78");
        p3.setEconomicOccupancyPct("75");
        propertyRepo.save(p3);

        // ── Loan Applications ──────────────────────────────────────────────
        LoanApplication app1 = new LoanApplication();
        app1.setId("seed_a01");
        app1.setStatus("Inquiry");
        app1.setBorrowerId("seed_b01");
        app1.setPropertyId("seed_p01");
        app1.setLoanType("Acquisition");
        app1.setLoanAmountUsd("8500000");
        app1.setLoanTermYears("10");
        app1.setInterestType("Fixed");
        app1.setAmortizationType("Full Amortizing");
        app1.setLtvPct("65");
        app1.setDscrRatio("1.28");
        app1.setTargetClosingDate(LocalDate.of(2026, 7, 15));
        app1.setRateType("Fixed Rate");
        app1.setAllInFixedRate("6.700000");
        appRepo.save(app1);

        LoanApplication app2 = new LoanApplication();
        app2.setId("seed_a02");
        app2.setStatus("Initial Credit Review");
        app2.setBorrowerId("seed_b02");
        app2.setPropertyId("seed_p02");
        app2.setLoanType("Refinance");
        app2.setLoanAmountUsd("14200000");
        app2.setLoanTermYears("5");
        app2.setInterestType("Adjustable");
        app2.setAmortizationType("25-Year Amortization");
        app2.setLtvPct("72");
        app2.setDscrRatio("1.15");
        app2.setTargetClosingDate(LocalDate.of(2026, 9, 30));
        app2.setRateType("Adjustable Rate");
        app2.setProformaAdjustableAllInRate("7.250000");
        appRepo.save(app2);

        LoanApplication app3 = new LoanApplication();
        app3.setId("seed_a03");
        app3.setStatus("Application Processing");
        app3.setBorrowerId("seed_b03");
        app3.setPropertyId("seed_p03");
        app3.setLoanType("Construction");
        app3.setLoanAmountUsd("5750000");
        app3.setLoanTermYears("3");
        app3.setInterestType("Fixed");
        app3.setAmortizationType("Interest Only");
        app3.setLtvPct("60");
        app3.setDscrRatio("1.42");
        app3.setTargetClosingDate(LocalDate.of(2026, 6, 30));
        app3.setRateType("Fixed Rate");
        app3.setAllInFixedRate("8.125000");
        appRepo.save(app3);

        // ── Loan Terms ──────────────────────────────────────────────────────
        LoanTerms terms1 = new LoanTerms();
        terms1.setApplicationId("seed_a01");
        terms1.setRateType("Fixed Rate");
        terms1.setBaseRate("0");
        terms1.setFixedRateVariance("0.250000");
        terms1.setIndexName("10Y Treasury");
        terms1.setIndexRate("4.450000");
        terms1.setSpreadOnFixed("2.000000");
        terms1.setAllInFixedRate("6.700000");
        terms1.setLoanAmountUsd("8500000");
        terms1.setLoanTermYears("10");
        terms1.setAmortizationYears("30");
        terms1.setAmortizationType("Full Amortizing");
        terms1.setLtvPct("65");
        terms1.setDscrRatio("1.28");
        terms1.setOriginationFeePct("1.00");
        terms1.setEcoaActionTaken("Pending");
        termsRepo.save(terms1);

        LoanTerms terms2 = new LoanTerms();
        terms2.setApplicationId("seed_a02");
        terms2.setRateType("Adjustable Rate");
        terms2.setBaseRate("0");
        terms2.setAdjustableRateVariance("0.500000");
        terms2.setAdjustableIndexName("SOFR");
        terms2.setAdjustableIndexRate("5.250000");
        terms2.setSpreadOnAdjustable("1.500000");
        terms2.setProformaAdjustableAllInRate("7.250000");
        terms2.setLoanAmountUsd("14200000");
        terms2.setLoanTermYears("5");
        terms2.setAmortizationYears("25");
        terms2.setAmortizationType("25-Year Amortization");
        terms2.setLtvPct("72");
        terms2.setDscrRatio("1.15");
        termsRepo.save(terms2);

        // ── Users ───────────────────────────────────────────────────────────
        String[][] users = {
            {"A100001", "Sarah",    "Thompson",  "sarah.thompson@bank.com",   "Senior Lender",          "Commercial Lending"},
            {"A100002", "James",    "Rodriguez", "j.rodriguez@bank.com",      "Credit Analyst",         "Credit"},
            {"A100003", "Amanda",   "Chen",      "a.chen@bank.com",           "Loan Processor",         "Operations"},
            {"A100004", "David",    "Okafor",    "d.okafor@bank.com",         "Closing Officer",        "Closing"},
            {"A100005", "Rachel",   "Kim",       "r.kim@bank.com",            "Portfolio Manager",      "Portfolio"},
            {"A100006", "Thomas",   "Brennan",   "t.brennan@bank.com",        "Chief Credit Officer",   "Credit"},
            {"A100007", "Maria",    "Gonzalez",  "m.gonzalez@bank.com",       "Compliance Officer",     "Compliance"},
            {"A100008", "Kevin",    "Walsh",     "k.walsh@bank.com",          "System Administrator",   "IT"},
        };

        for (String[] u : users) {
            AppUser user = new AppUser();
            user.setId(UUID.randomUUID().toString());
            user.setSid(u[0]);
            user.setFirstName(u[1]);
            user.setLastName(u[2]);
            user.setEmail(u[3]);
            user.setRole(u[4]);
            user.setDepartment(u[5]);
            user.setActive(true);
            userRepo.save(user);
        }

        // ── Activity Logs ───────────────────────────────────────────────────
        String[][] logs = {
            {"seed_a01", "CREATED",       "Application created for 1200 Market Street", "Sarah Thompson"},
            {"seed_a01", "STATUS_CHANGE", "Inquiry → Initial Credit Review",            "Sarah Thompson"},
            {"seed_a02", "CREATED",       "Application created for 350 Park Avenue",    "James Rodriguez"},
            {"seed_a02", "STATUS_CHANGE", "Inquiry → Initial Credit Review",            "James Rodriguez"},
            {"seed_a03", "CREATED",       "Application created for 225 W Wacker Drive", "Amanda Chen"},
            {"seed_a03", "STATUS_CHANGE", "Initial Credit Review → Application Start",  "Amanda Chen"},
            {"seed_a03", "STATUS_CHANGE", "Application Start → Application Processing", "Amanda Chen"},
            {"seed_a01", "COMMENT_ADDED", "Credit memo attached to deal file",          "James Rodriguez"},
        };

        for (String[] l : logs) {
            ActivityLog al = new ActivityLog();
            al.setId(UUID.randomUUID().toString());
            al.setApplicationId(l[0]);
            al.setAction(l[1]);
            al.setDescription(l[2]);
            al.setUserName(l[3]);
            logRepo.save(al);
        }

        // ── Comments ────────────────────────────────────────────────────────
        Comment c1 = new Comment();
        c1.setId(UUID.randomUUID().toString());
        c1.setApplicationId("seed_a01");
        c1.setBody("Initial borrower financials reviewed. Net worth and liquidity meet minimum thresholds. DSCR of 1.28x is solid for this market. Moving to credit memo preparation.");
        c1.setAuthorName("James Rodriguez");
        c1.setAuthorSid("A100002");
        commentRepo.save(c1);

        Comment c2 = new Comment();
        c2.setId(UUID.randomUUID().toString());
        c2.setApplicationId("seed_a01");
        c2.setParentCommentId(c1.getId());
        c2.setBody("Agreed. Also confirmed that the property's 91% physical occupancy is supported by signed leases. Environmental Phase I is ordered.");
        c2.setAuthorName("Sarah Thompson");
        c2.setAuthorSid("A100001");
        commentRepo.save(c2);

        Comment c3 = new Comment();
        c3.setId(UUID.randomUUID().toString());
        c3.setApplicationId("seed_a02");
        c3.setBody("Borrower requested SOFR-based ARM. Current SOFR at 5.25% — proforma all-in rate 7.25% is within policy. LTV of 72% needs CCO sign-off per CRE policy.");
        c3.setAuthorName("James Rodriguez");
        c3.setAuthorSid("A100002");
        commentRepo.save(c3);

        // ── Documents ───────────────────────────────────────────────────────
        String[][] docs = {
            {"seed_a01", "Borrower_Financial_Statements_2025.pdf", "application/pdf",   "Borrower Financials", "James Rodriguez",  "Annual financial statements — 3 years"},
            {"seed_a01", "Appraisal_1200_Market_St.pdf",          "application/pdf",   "Appraisal",           "Amanda Chen",      "FIRREA-compliant appraisal — $13.1M as-is value"},
            {"seed_a01", "Phase_I_Environmental.pdf",             "application/pdf",   "Environmental",       "Amanda Chen",      "Phase I ESA — no RECs identified"},
            {"seed_a02", "Borrower_Tax_Returns_2024.pdf",         "application/pdf",   "Tax Returns",         "James Rodriguez",  "Federal tax returns — 3 years"},
            {"seed_a02", "Rent_Roll_350_Park_Ave.xlsx",           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                         "Rent Roll", "Sarah Thompson", "Current rent roll as of March 2026"},
            {"seed_a03", "Construction_Budget.pdf",               "application/pdf",   "Construction",        "Amanda Chen",      "Contractor-signed construction budget"},
        };

        for (String[] d : docs) {
            Document doc = new Document();
            doc.setId(UUID.randomUUID().toString());
            doc.setApplicationId(d[0]);
            doc.setFileName(d[1]);
            doc.setFileType(d[2]);
            doc.setCategory(d[3]);
            doc.setUploadedBy(d[4]);
            doc.setDescription(d[5]);
            doc.setFileSizeBytes((long)(Math.random() * 5_000_000 + 200_000));
            documentRepo.save(doc);
        }

        log.info("Seed data complete — 3 borrowers, 3 properties, 3 applications, 8 users, 3 comments, 6 documents.");
    }
}
