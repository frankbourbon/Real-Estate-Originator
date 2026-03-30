import React from "react";

import { AdminServiceProvider } from "@/services/admin";
import { ApplicationDispositionServiceProvider } from "@/services/application-disposition";
import { ApplicationStartServiceProvider } from "@/services/application-start";
import { ClosingServiceProvider } from "@/services/closing";
import { CommentsServiceProvider } from "@/services/comments";
import { ConditionsServiceProvider } from "@/services/conditions";
import { CoreServiceProvider } from "@/services/core";
import { DocumentsServiceProvider } from "@/services/documents";
import { FinalCreditReviewServiceProvider } from "@/services/final-credit-review";
import { InquiryDispositionServiceProvider } from "@/services/inquiry-disposition";
import { InquiryServiceProvider } from "@/services/inquiry";
import { LetterOfInterestServiceProvider } from "@/services/letter-of-interest";
import { LoanTeamServiceProvider } from "@/services/loan-team";
import { PhaseDataServiceProvider } from "@/services/phase-data";
import { PreCloseServiceProvider } from "@/services/pre-close";
import { ProcessingServiceProvider } from "@/services/processing";
import { ReadyForDocsServiceProvider } from "@/services/ready-for-docs";
import { TasksServiceProvider } from "@/services/tasks";

/**
 * Composes all 17 microservice providers.
 * Services are completely independent — no service imports from another.
 * They are linked only by applicationId strings at the UI layer.
 *
 * Admin and LoanTeam are intentionally decoupled:
 * adminSid in LoanTeam is a soft reference (not a FK) — deletes/updates
 * in Admin do not cascade to loan-level team records.
 */
export function ServiceProviders({ children }: { children: React.ReactNode }) {
  return (
    <AdminServiceProvider>
      <CoreServiceProvider>
        <PhaseDataServiceProvider>
        <InquiryServiceProvider>
          <InquiryDispositionServiceProvider>
            <LetterOfInterestServiceProvider>
              <ApplicationStartServiceProvider>
                <ApplicationDispositionServiceProvider>
                  <ProcessingServiceProvider>
                    <FinalCreditReviewServiceProvider>
                      <ConditionsServiceProvider>
                        <PreCloseServiceProvider>
                          <ReadyForDocsServiceProvider>
                            <ClosingServiceProvider>
                              <DocumentsServiceProvider>
                                <TasksServiceProvider>
                                  <CommentsServiceProvider>
                                    <LoanTeamServiceProvider>
                                      {children}
                                    </LoanTeamServiceProvider>
                                  </CommentsServiceProvider>
                                </TasksServiceProvider>
                              </DocumentsServiceProvider>
                            </ClosingServiceProvider>
                          </ReadyForDocsServiceProvider>
                        </PreCloseServiceProvider>
                      </ConditionsServiceProvider>
                    </FinalCreditReviewServiceProvider>
                  </ProcessingServiceProvider>
                </ApplicationDispositionServiceProvider>
              </ApplicationStartServiceProvider>
            </LetterOfInterestServiceProvider>
          </InquiryDispositionServiceProvider>
        </InquiryServiceProvider>
        </PhaseDataServiceProvider>
      </CoreServiceProvider>
    </AdminServiceProvider>
  );
}
