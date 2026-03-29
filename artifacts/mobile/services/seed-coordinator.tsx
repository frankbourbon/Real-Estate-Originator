import { useCallback } from "react";

import { useAdminService } from "@/services/admin";
import { useApplicationStartService } from "@/services/application-start";
import { useClosingService } from "@/services/closing";
import { useCommentsService } from "@/services/comments";
import { useConditionsService } from "@/services/conditions";
import { useCoreService } from "@/services/core";
import { useDocumentsService } from "@/services/documents";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useInquiryService } from "@/services/inquiry";
import { useLetterOfInterestService } from "@/services/letter-of-interest";
import { useLoanTeamService } from "@/services/loan-team";
import { usePreCloseService } from "@/services/pre-close";
import { useProcessingService } from "@/services/processing";
import { useReadyForDocsService } from "@/services/ready-for-docs";
import { useTasksService } from "@/services/tasks";

/**
 * Coordinates seed data loading and clearing across all 15 services.
 * Must be used inside <ServiceProviders>.
 *
 * Note: Admin seed data is always loaded with the sample data set.
 * Admin users are NOT cleared when clearing loan data — they represent
 * the global employee registry, which is independent of loan records.
 * LoanTeam.clearForApplication removes loan-level members only; admin
 * records are unaffected.
 */
export function useSeedCoordinator() {
  const admin = useAdminService();
  const core = useCoreService();
  const inquiry = useInquiryService();
  const loi = useLetterOfInterestService();
  const appStart = useApplicationStartService();
  const processing = useProcessingService();
  const fcr = useFinalCreditReviewService();
  const conditions = useConditionsService();
  const preClose = usePreCloseService();
  const rfd = useReadyForDocsService();
  const closing = useClosingService();
  const documents = useDocumentsService();
  const tasks = useTasksService();
  const comments = useCommentsService();
  const loanTeam = useLoanTeamService();

  const loadAllSeedData = useCallback(async () => {
    await Promise.all([
      admin.loadSeedData(),
      core.loadSeedData(),
      inquiry.loadSeedData(),
      loi.loadSeedData(),
      appStart.loadSeedData(),
      processing.loadSeedData(),
      fcr.loadSeedData(),
      conditions.loadSeedData(),
      preClose.loadSeedData(),
      rfd.loadSeedData(),
      closing.loadSeedData(),
      documents.loadSeedData(),
      tasks.loadSeedData(),
      comments.loadSeedData(),
      loanTeam.loadSeedData(),
    ]);
  }, [admin, core, inquiry, loi, appStart, processing, fcr, conditions, preClose, rfd, closing, documents, tasks, comments, loanTeam]);

  const clearAllData = useCallback(async () => {
    await Promise.all([
      core.clearData(),
      inquiry.clearData(),
      loi.clearData(),
      appStart.clearData(),
      processing.clearData(),
      fcr.clearData(),
      conditions.clearData(),
      preClose.clearData(),
      rfd.clearData(),
      closing.clearData(),
      documents.clearData(),
      tasks.clearData(),
      comments.clearData(),
      loanTeam.clearData(),
      // Admin is intentionally NOT cleared here — it is the global employee
      // registry and is independent of loan lifecycle.
    ]);
  }, [core, inquiry, loi, appStart, processing, fcr, conditions, preClose, rfd, closing, documents, tasks, comments, loanTeam]);

  /**
   * Clears all phase-service data for a specific application (cascade delete).
   * Call this before deleting an application from CoreService.
   * Admin records are never touched — only loan-level team members are removed.
   */
  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      inquiry.clearForApplication(applicationId),
      loi.clearForApplication(applicationId),
      appStart.clearForApplication(applicationId),
      processing.clearForApplication(applicationId),
      fcr.clearForApplication(applicationId),
      conditions.clearForApplication(applicationId),
      preClose.clearForApplication(applicationId),
      rfd.clearForApplication(applicationId),
      closing.clearForApplication(applicationId),
      documents.clearForApplication(applicationId),
      tasks.clearForApplication(applicationId),
      comments.clearForApplication(applicationId),
      loanTeam.clearForApplication(applicationId),
    ]);
    await core.deleteApplication(applicationId);
  }, [core, inquiry, loi, appStart, processing, fcr, conditions, preClose, rfd, closing, documents, tasks, comments, loanTeam]);

  return { loadAllSeedData, clearAllData, clearForApplication };
}
