import React from "react";

import { AdminServiceProvider } from "@/services/admin";
import { ApplicationDispositionServiceProvider } from "@/services/application-disposition";
import { ApplicationServiceProvider } from "@/services/application";
import { ClosingServiceProvider } from "@/services/closing";
import { CommentsServiceProvider } from "@/services/comments";
import { ConditionsServiceProvider } from "@/services/conditions";
import { CoreServiceProvider } from "@/services/core";
import { DocumentsServiceProvider } from "@/services/documents";
import { FinalCreditReviewServiceProvider } from "@/services/final-credit-review";
import { ICRServiceProvider } from "@/services/initial-credit-review";
import { InquiryDispositionServiceProvider } from "@/services/inquiry-disposition";
import { InquiryServiceProvider } from "@/services/inquiry";
import { LoanTeamServiceProvider } from "@/services/loan-team";
import { PhaseDataServiceProvider } from "@/services/phase-data";
import { RbacServiceProvider } from "@/services/rbac";
import { SessionServiceProvider } from "@/services/session";
import { SystemCoreServiceProvider } from "@/services/system-core";
import { TasksServiceProvider } from "@/services/tasks";

/**
 * Composes all microservice providers.
 *
 * Services are completely independent — no service imports from another.
 * They are linked only by applicationId strings at the UI layer.
 *
 * Phase MS structure:
 *   Inquiry → Initial Credit Review → Application → Final Credit Review → Closing
 *
 * Identity + Permissions hierarchy:
 *   Session → stores the active SID (who is logged in)
 *   SystemCore → owns Profiles + User→Profile assignments (central profile registry)
 *   Rbac → owns ProfileEntitlement mappings and resolves hasPermission()
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
                  <ICRServiceProvider>
                    <ApplicationServiceProvider>
                      <ApplicationDispositionServiceProvider>
                        <FinalCreditReviewServiceProvider>
                          <ConditionsServiceProvider>
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
                          </ConditionsServiceProvider>
                        </FinalCreditReviewServiceProvider>
                      </ApplicationDispositionServiceProvider>
                    </ApplicationServiceProvider>
                  </ICRServiceProvider>
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
