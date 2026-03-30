import { useCallback } from "react";

import { useAdminService } from "@/services/admin";
import { useApplicationDispositionService } from "@/services/application-disposition";
import { useApplicationStartService } from "@/services/application-start";
import { useClosingService } from "@/services/closing";
import { useCommentsService } from "@/services/comments";
import { useConditionsService } from "@/services/conditions";
import { useCoreService } from "@/services/core";
import { useDocumentsService } from "@/services/documents";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useInquiryDispositionService } from "@/services/inquiry-disposition";
import { useInquiryService } from "@/services/inquiry";
import { useLetterOfInterestService } from "@/services/letter-of-interest";
import { useLoanTeamService } from "@/services/loan-team";
import { usePhaseDataService } from "@/services/phase-data";
import { usePreCloseService } from "@/services/pre-close";
import { useProcessingService } from "@/services/processing";
import { useRbacService } from "@/services/rbac";
import { useReadyForDocsService } from "@/services/ready-for-docs";
import { useTasksService } from "@/services/tasks";

/**
 * Coordinates seed data loading and clearing across all 19 services.
 * Must be used inside <ServiceProviders>.
 *
 * Admin records represent the global employee registry and are independent of
 * loan records. RBAC profiles and assignments are loaded alongside admin users
 * so the seed dataset is immediately usable with permission checking.
 *
 * LoanTeam.clearForApplication removes loan-level members only; admin and RBAC
 * records are never affected by per-application operations.
 */
export function useSeedCoordinator() {
  const admin = useAdminService();
  const rbac = useRbacService();
  const core = useCoreService();
  const phaseData = usePhaseDataService();
  const inquiry = useInquiryService();
  const inquiryDisposition = useInquiryDispositionService();
  const loi = useLetterOfInterestService();
  const appStart = useApplicationStartService();
  const appDisposition = useApplicationDispositionService();
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
      rbac.loadSeedData(),
      core.loadSeedData(),
      inquiry.loadSeedData(),
      inquiryDisposition.loadSeedData(),
      loi.loadSeedData(),
      appStart.loadSeedData(),
      appDisposition.loadSeedData(),
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
  }, [admin, rbac, core, inquiry, inquiryDisposition, loi, appStart, appDisposition,
      processing, fcr, conditions, preClose, rfd, closing, documents, tasks,
      comments, loanTeam]);

  const clearAllData = useCallback(async () => {
    await Promise.all([
      admin.clearData(),
      rbac.clearData(),
      core.clearData(),
      phaseData.clearData(),
      inquiry.clearData(),
      inquiryDisposition.clearData(),
      loi.clearData(),
      appStart.clearData(),
      appDisposition.clearData(),
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
    ]);
  }, [admin, rbac, core, phaseData, inquiry, inquiryDisposition, loi, appStart,
      appDisposition, processing, fcr, conditions, preClose, rfd, closing,
      documents, tasks, comments, loanTeam]);

  /**
   * Clears all phase-service data for a specific application (cascade delete).
   * Call this before deleting an application from CoreService.
   * Admin and RBAC records are never touched — only loan-level data is removed.
   */
  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      phaseData.clearForApplication(applicationId),
      inquiry.clearForApplication(applicationId),
      inquiryDisposition.clearForApplication(applicationId),
      loi.clearForApplication(applicationId),
      appStart.clearForApplication(applicationId),
      appDisposition.clearForApplication(applicationId),
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
  }, [core, phaseData, inquiry, inquiryDisposition, loi, appStart, appDisposition,
      processing, fcr, conditions, preClose, rfd, closing, documents, tasks,
      comments, loanTeam]);

  return { loadAllSeedData, clearAllData, clearForApplication };
}
