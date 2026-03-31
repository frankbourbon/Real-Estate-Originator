import { useCallback } from "react";

import { useAdminService } from "@/services/admin";
import { useApplicationDispositionService } from "@/services/application-disposition";
import { useApplicationService } from "@/services/application";
import { useClosingService } from "@/services/closing";
import { useCommentsService } from "@/services/comments";
import { useConditionsService } from "@/services/conditions";
import { useCoreService } from "@/services/core";
import { useDocumentsService } from "@/services/documents";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useICRService } from "@/services/initial-credit-review";
import { useInquiryDispositionService } from "@/services/inquiry-disposition";
import { useInquiryService } from "@/services/inquiry";
import { useLoanTeamService } from "@/services/loan-team";
import { usePhaseDataService } from "@/services/phase-data";
import { useRbacService } from "@/services/rbac";
import { useSystemCoreService } from "@/services/system-core";
import { useTasksService } from "@/services/tasks";

/**
 * Coordinates seed data loading and clearing across all microservices.
 * Must be used inside <ServiceProviders>.
 *
 * Phase MS order: Inquiry → ICR → Application → FCR → Closing
 *
 * SystemCore and Admin are seeded together because they represent the global
 * employee + profile registry. Rbac (entitlement mappings) is seeded alongside
 * them so the full permission model is immediately usable.
 */
export function useSeedCoordinator() {
  const systemCore = useSystemCoreService();
  const admin      = useAdminService();
  const rbac       = useRbacService();
  const core       = useCoreService();
  const phaseData  = usePhaseDataService();
  const inquiry    = useInquiryService();
  const inquiryDisposition = useInquiryDispositionService();
  const icr        = useICRService();
  const application = useApplicationService();
  const appDisposition = useApplicationDispositionService();
  const fcr        = useFinalCreditReviewService();
  const conditions = useConditionsService();
  const closing    = useClosingService();
  const documents  = useDocumentsService();
  const tasks      = useTasksService();
  const comments   = useCommentsService();
  const loanTeam   = useLoanTeamService();

  const loadAllSeedData = useCallback(async () => {
    await Promise.all([
      systemCore.loadSeedData(),
      admin.loadSeedData(),
      rbac.loadSeedData(),
      core.loadSeedData(),
      inquiry.loadSeedData(),
      inquiryDisposition.loadSeedData(),
      icr.loadSeedData(),
      application.loadSeedData(),
      appDisposition.loadSeedData(),
      fcr.loadSeedData(),
      conditions.loadSeedData(),
      closing.loadSeedData(),
      documents.loadSeedData(),
      tasks.loadSeedData(),
      comments.loadSeedData(),
      loanTeam.loadSeedData(),
    ]);
  }, [systemCore, admin, rbac, core, inquiry, inquiryDisposition, icr, application,
      appDisposition, fcr, conditions, closing, documents, tasks, comments, loanTeam]);

  const clearAllData = useCallback(async () => {
    await Promise.all([
      systemCore.clearData(),
      admin.clearData(),
      rbac.clearData(),
      core.clearData(),
      phaseData.clearData(),
      inquiry.clearData(),
      inquiryDisposition.clearData(),
      icr.clearData(),
      application.clearData(),
      appDisposition.clearData(),
      fcr.clearData(),
      conditions.clearData(),
      closing.clearData(),
      documents.clearData(),
      tasks.clearData(),
      comments.clearData(),
      loanTeam.clearData(),
    ]);
  }, [systemCore, admin, rbac, core, phaseData, inquiry, inquiryDisposition, icr,
      application, appDisposition, fcr, conditions, closing, documents, tasks, comments, loanTeam]);

  /**
   * Clears all phase-service data for a specific application (cascade delete).
   * Call this before deleting an application from CoreService.
   * SystemCore, Admin, and RBAC records are never touched — only loan-level data is removed.
   */
  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      phaseData.clearForApplication(applicationId),
      inquiry.clearForApplication(applicationId),
      inquiryDisposition.clearForApplication(applicationId),
      icr.clearForApplication(applicationId),
      application.clearForApplication(applicationId),
      appDisposition.clearForApplication(applicationId),
      fcr.clearForApplication(applicationId),
      conditions.clearForApplication(applicationId),
      closing.clearForApplication(applicationId),
      documents.clearForApplication(applicationId),
      tasks.clearForApplication(applicationId),
      comments.clearForApplication(applicationId),
      loanTeam.clearForApplication(applicationId),
    ]);
    await core.deleteApplication(applicationId);
  }, [core, phaseData, inquiry, inquiryDisposition, icr, application, appDisposition,
      fcr, conditions, closing, documents, tasks, comments, loanTeam]);

  return { loadAllSeedData, clearAllData, clearForApplication };
}
