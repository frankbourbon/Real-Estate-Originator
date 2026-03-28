import { useCallback } from "react";

import { useApplicationStartService } from "@/services/application-start";
import { useClosingService } from "@/services/closing";
import { useCommentsService } from "@/services/comments";
import { useCoreService } from "@/services/core";
import { useDocumentsService } from "@/services/documents";
import { useDocsBackService } from "@/services/docs-back";
import { useDocsDrawnService } from "@/services/docs-drawn";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useInquiryService } from "@/services/inquiry";
import { useLetterOfInterestService } from "@/services/letter-of-interest";
import { usePreCloseService } from "@/services/pre-close";
import { useProcessingService } from "@/services/processing";
import { useReadyForDocsService } from "@/services/ready-for-docs";
import { useTasksService } from "@/services/tasks";

/**
 * Coordinates seed data loading and clearing across all 14 services.
 * Must be used inside <ServiceProviders>.
 */
export function useSeedCoordinator() {
  const core = useCoreService();
  const inquiry = useInquiryService();
  const loi = useLetterOfInterestService();
  const appStart = useApplicationStartService();
  const processing = useProcessingService();
  const fcr = useFinalCreditReviewService();
  const preClose = usePreCloseService();
  const rfd = useReadyForDocsService();
  const docsDrawn = useDocsDrawnService();
  const docsBack = useDocsBackService();
  const closing = useClosingService();
  const documents = useDocumentsService();
  const tasks = useTasksService();
  const comments = useCommentsService();

  const loadAllSeedData = useCallback(async () => {
    await Promise.all([
      core.loadSeedData(),
      inquiry.loadSeedData(),
      loi.loadSeedData(),
      appStart.loadSeedData(),
      processing.loadSeedData(),
      fcr.loadSeedData(),
      preClose.loadSeedData(),
      rfd.loadSeedData(),
      docsDrawn.loadSeedData(),
      docsBack.loadSeedData(),
      closing.loadSeedData(),
      documents.loadSeedData(),
      tasks.loadSeedData(),
      comments.loadSeedData(),
    ]);
  }, [core, inquiry, loi, appStart, processing, fcr, preClose, rfd, docsDrawn, docsBack, closing, documents, tasks, comments]);

  const clearAllData = useCallback(async () => {
    await Promise.all([
      core.clearData(),
      inquiry.clearData(),
      loi.clearData(),
      appStart.clearData(),
      processing.clearData(),
      fcr.clearData(),
      preClose.clearData(),
      rfd.clearData(),
      docsDrawn.clearData(),
      docsBack.clearData(),
      closing.clearData(),
      documents.clearData(),
      tasks.clearData(),
      comments.clearData(),
    ]);
  }, [core, inquiry, loi, appStart, processing, fcr, preClose, rfd, docsDrawn, docsBack, closing, documents, tasks, comments]);

  /**
   * Clears all phase-service data for a specific application (cascade delete).
   * Call this before deleting an application from CoreService.
   */
  const clearForApplication = useCallback(async (applicationId: string) => {
    await Promise.all([
      inquiry.clearForApplication(applicationId),
      loi.clearForApplication(applicationId),
      appStart.clearForApplication(applicationId),
      processing.clearForApplication(applicationId),
      fcr.clearForApplication(applicationId),
      preClose.clearForApplication(applicationId),
      rfd.clearForApplication(applicationId),
      docsDrawn.clearForApplication(applicationId),
      docsBack.clearForApplication(applicationId),
      closing.clearForApplication(applicationId),
      documents.clearForApplication(applicationId),
      tasks.clearForApplication(applicationId),
      comments.clearForApplication(applicationId),
    ]);
    await core.deleteApplication(applicationId);
  }, [core, inquiry, loi, appStart, processing, fcr, preClose, rfd, docsDrawn, docsBack, closing, documents, tasks, comments]);

  return { loadAllSeedData, clearAllData, clearForApplication };
}
