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
import { RbacServiceProvider } from "@/services/rbac";
import { ReadyForDocsServiceProvider } from "@/services/ready-for-docs";
import { SessionServiceProvider } from "@/services/session";
import { SystemCoreServiceProvider } from "@/services/system-core";
import { TasksServiceProvider } from "@/services/tasks";

/**
 * Composes all 20 microservice providers.
 *
 * Services are completely independent — no service imports from another.
 * They are linked only by applicationId strings at the UI layer.
 *
 * Identity + Permissions hierarchy:
 *   Session → stores the active SID (who is logged in)
 *   SystemCore → owns Profiles + User→Profile assignments (central profile registry)
 *   Rbac → owns ProfileEntitlement mappings and resolves hasPermission()
 *
 * SystemCore is a peer MS to all others. It just happens to be consumed by the
 * usePermission hook alongside Rbac for the two-step permission resolution.
 */
export function ServiceProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionServiceProvider>
      <SystemCoreServiceProvider>
        <RbacServiceProvider>
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
        </RbacServiceProvider>
      </SystemCoreServiceProvider>
    </SessionServiceProvider>
  );
}
