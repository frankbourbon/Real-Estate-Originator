import React from "react";

import { ApplicationStartServiceProvider } from "@/services/application-start";
import { ClosingServiceProvider } from "@/services/closing";
import { CommentsServiceProvider } from "@/services/comments";
import { ConditionsServiceProvider } from "@/services/conditions";
import { CoreServiceProvider } from "@/services/core";
import { DocumentsServiceProvider } from "@/services/documents";
import { FinalCreditReviewServiceProvider } from "@/services/final-credit-review";
import { InquiryServiceProvider } from "@/services/inquiry";
import { LetterOfInterestServiceProvider } from "@/services/letter-of-interest";
import { PreCloseServiceProvider } from "@/services/pre-close";
import { ProcessingServiceProvider } from "@/services/processing";
import { ReadyForDocsServiceProvider } from "@/services/ready-for-docs";
import { TasksServiceProvider } from "@/services/tasks";

/**
 * Composes all 12 microservice providers.
 * Services are completely independent — no service imports from another.
 * They are linked only by applicationId strings at the UI layer.
 */
export function ServiceProviders({ children }: { children: React.ReactNode }) {
  return (
    <CoreServiceProvider>
      <InquiryServiceProvider>
        <LetterOfInterestServiceProvider>
          <ApplicationStartServiceProvider>
            <ProcessingServiceProvider>
              <FinalCreditReviewServiceProvider>
                <ConditionsServiceProvider>
                  <PreCloseServiceProvider>
                    <ReadyForDocsServiceProvider>
                      <ClosingServiceProvider>
                        <DocumentsServiceProvider>
                          <TasksServiceProvider>
                            <CommentsServiceProvider>
                              {children}
                            </CommentsServiceProvider>
                          </TasksServiceProvider>
                        </DocumentsServiceProvider>
                      </ClosingServiceProvider>
                    </ReadyForDocsServiceProvider>
                  </PreCloseServiceProvider>
                </ConditionsServiceProvider>
              </FinalCreditReviewServiceProvider>
            </ProcessingServiceProvider>
          </ApplicationStartServiceProvider>
        </LetterOfInterestServiceProvider>
      </InquiryServiceProvider>
    </CoreServiceProvider>
  );
}
