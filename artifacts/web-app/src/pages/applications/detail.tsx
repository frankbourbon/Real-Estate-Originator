import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetApplication,
  useAdvanceApplicationStatus,
  useGetLoanTerms,
  useListComments,
  useListDocuments,
  useCreateComment,
  useDeleteComment,
  useUploadDocument,
  useDeleteDocument,
  useDeleteApplication,
  useUpdateApplication,
  useUpdateLoanTerms,
  getGetApplicationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, Send, Building2, User, Activity, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ApplicationDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState("");

  const { data: app, isLoading: isAppLoading } = useGetApplication(id as string, {
    query: { enabled: !!id, queryKey: getGetApplicationQueryKey(id as string) }
  });
  
  const { data: terms, isLoading: isTermsLoading } = useGetLoanTerms(id as string, {
    query: { enabled: !!id }
  });

  const { data: comments, isLoading: isCommentsLoading } = useListComments(id as string, {
    query: { enabled: !!id }
  });

  const { data: documents, isLoading: isDocsLoading } = useListDocuments(id as string, {
    query: { enabled: !!id }
  });

  const advanceStatusMutation = useAdvanceApplicationStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(id as string) });
        toast({ title: "Status Advanced" });
      }
    }
  });

  const deleteAppMutation = useDeleteApplication({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application Deleted" });
        setLocation("/applications");
      }
    }
  });

  const updateAppMutation = useUpdateApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(id as string) });
        toast({ title: "Application Updated" });
      }
    }
  });

  const updateTermsMutation = useUpdateLoanTerms({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "terms"] });
        toast({ title: "Terms Updated" });
      }
    }
  });

  const createCommentMutation = useCreateComment({
    mutation: {
      onSuccess: () => {
        setCommentBody("");
        queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "comments"] });
      }
    }
  });

  const deleteCommentMutation = useDeleteComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "comments"] });
      }
    }
  });

  const uploadDocMutation = useUploadDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "documents"] });
        toast({ title: "Document Uploaded" });
      }
    }
  });

  const deleteDocMutation = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/applications", id, "documents"] });
        toast({ title: "Document Deleted" });
      }
    }
  });

  const handleAdvanceStatus = () => {
    const nextStatuses: Record<string, string> = {
      "Inquiry": "ICR",
      "ICR": "Application",
      "Application": "FCR",
      "FCR": "Closing",
      "Closing": "Disposed"
    };
    if (app?.status && nextStatuses[app.status]) {
      advanceStatusMutation.mutate({ 
        id: id as string, 
        data: { nextStatus: nextStatuses[app.status] } 
      });
    }
  };

  const handleAddComment = () => {
    if (!commentBody.trim()) return;
    createCommentMutation.mutate({
      id: id as string,
      data: {
        body: commentBody,
        authorName: "Current User",
      }
    });
  };

  if (isAppLoading) {
    return <div className="space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!app) return <div>Application not found</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {app.propertyAddress || "Unnamed Application"}
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-sm py-0.5 px-2">
              {app.status}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" /> {app.borrowerName} • <Building2 className="h-4 w-4 ml-1" /> {app.loanType}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => updateAppMutation.mutate({ id: id as string, data: { loanType: app.loanType }})}>
            <Edit className="h-4 w-4 mr-2" /> Quick Edit
          </Button>
          <Button variant="destructive" onClick={() => deleteAppMutation.mutate({ id: id as string })} disabled={deleteAppMutation.isPending}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button 
            onClick={handleAdvanceStatus} 
            disabled={advanceStatusMutation.isPending || app.status === "Disposed"}
            className="bg-sidebar text-sidebar-foreground hover:bg-sidebar/90"
          >
            Advance Phase <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 shadow-sm border-border h-fit">
          <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
            <CardTitle className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Quick Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Loan Amount</p>
              <p className="font-mono text-lg font-semibold">${Number(app.loanAmountUsd).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Rate Type</p>
              <p className="font-medium text-gray-900">{app.rateType || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">All-in Rate</p>
              <p className="font-mono font-medium text-gray-900">
                {app.allInFixedRate ? `${parseFloat(app.allInFixedRate).toFixed(3)}%` : app.proformaAdjustableAllInRate ? `${parseFloat(app.proformaAdjustableAllInRate).toFixed(3)}% (Proforma)` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Target Close</p>
              <p className="font-medium text-gray-900">{app.targetClosingDate ? format(new Date(app.targetClosingDate), 'MMM d, yyyy') : "TBD"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-gray-100/80">
              <TabsTrigger value="overview" className="py-2.5">Overview</TabsTrigger>
              <TabsTrigger value="loan-terms" className="py-2.5">Loan Terms</TabsTrigger>
              <TabsTrigger value="borrower" className="py-2.5">Borrower</TabsTrigger>
              <TabsTrigger value="property" className="py-2.5">Property</TabsTrigger>
              <TabsTrigger value="comments" className="py-2.5">Comments</TabsTrigger>
              <TabsTrigger value="documents" className="py-2.5">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="shadow-sm border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Deal Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <DetailItem label="Loan Type" value={app.loanType} />
                  <DetailItem label="Term (Years)" value={app.loanTermYears} />
                  <DetailItem label="Interest Type" value={app.interestType} />
                  <DetailItem label="Amortization" value={app.amortizationType} />
                  <DetailItem label="LTV %" value={app.ltvPct ? `${app.ltvPct}%` : null} />
                  <DetailItem label="DSCR" value={app.dscrRatio ? `${app.dscrRatio}x` : null} />
                  <DetailItem label="Created At" value={app.createdAt ? format(new Date(app.createdAt), 'PPpp') : null} />
                  <DetailItem label="Last Updated" value={app.updatedAt ? format(new Date(app.updatedAt), 'PPpp') : null} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loan-terms" className="mt-6 space-y-6">
              {isTermsLoading ? <Skeleton className="h-64" /> : !terms ? (
                <Card className="shadow-sm">
                  <CardContent className="py-8 text-center text-gray-500">
                    No loan terms configured.
                    <Button variant="outline" className="mt-4 block mx-auto" onClick={() => updateTermsMutation.mutate({ id: id as string, data: { rateType: "Fixed" }})}>Initialize Terms</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card className="shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-gray-50/50 flex flex-row justify-between items-center">
                      <CardTitle className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Pricing Fields</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => updateTermsMutation.mutate({ id: id as string, data: { rateType: terms.rateType }})}>Edit</Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {terms.rateType === "Fixed" ? (
                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                          <DetailItem label="Base Rate" value={`${terms.baseRate}%`} />
                          <DetailItem label="Variance" value={`${terms.fixedRateVariance}%`} />
                          <DetailItem label="Index Name" value={terms.indexName} />
                          <DetailItem label="Index Rate" value={`${terms.indexRate}%`} />
                          <DetailItem label="Spread" value={`${terms.spreadOnFixed}%`} />
                          <DetailItem label="All-in Fixed Rate" value={`${terms.allInFixedRate}%`} highlight />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                          <DetailItem label="Variance" value={`${terms.adjustableRateVariance}%`} />
                          <DetailItem label="Index Name" value={terms.adjustableIndexName} />
                          <DetailItem label="Index Rate" value={`${terms.adjustableIndexRate}%`} />
                          <DetailItem label="Spread" value={`${terms.spreadOnAdjustable}%`} />
                          <DetailItem label="Proforma All-in Rate" value={`${terms.proformaAdjustableAllInRate}%`} highlight />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
                      <CardTitle className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Additional Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-2 gap-y-6 gap-x-8">
                      <DetailItem label="Interest Only Period (Mo)" value={terms.interestOnlyPeriodMonths} />
                      <DetailItem label="Prepayment Penalty %" value={terms.prepaymentPenaltyPct ? `${terms.prepaymentPenaltyPct}%` : null} />
                      <DetailItem label="Origination Fee %" value={terms.originationFeePct ? `${terms.originationFeePct}%` : null} />
                      <DetailItem label="Amortization (Years)" value={terms.amortizationYears} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="borrower" className="mt-6 space-y-6">
              {app.borrower ? (
                <Card className="shadow-sm border-border">
                  <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Borrower Details</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/borrowers/${app.borrowerId}`}>View Full Profile</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-2 gap-y-6 gap-x-8">
                    <DetailItem label="Name" value={`${app.borrower.firstName} ${app.borrower.lastName}`} />
                    <DetailItem label="Entity Name" value={app.borrower.entityName} />
                    <DetailItem label="Email" value={app.borrower.email} />
                    <DetailItem label="Phone" value={app.borrower.phone} />
                    <DetailItem label="Location" value={`${app.borrower.city || ''}, ${app.borrower.state || ''}`} />
                    <DetailItem label="Net Worth" value={app.borrower.netWorthUsd ? `$${Number(app.borrower.netWorthUsd).toLocaleString()}` : null} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm"><CardContent className="py-8 text-center text-gray-500">No borrower attached.</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="property" className="mt-6 space-y-6">
              {app.property ? (
                <Card className="shadow-sm border-border">
                  <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Property Details</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/properties/${app.propertyId}`}>View Property</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-2 gap-y-6 gap-x-8">
                    <DetailItem label="Address" value={app.property.streetAddress} />
                    <DetailItem label="Location" value={`${app.property.city}, ${app.property.state} ${app.property.zipCode}`} />
                    <DetailItem label="Property Type" value={app.property.propertyType} />
                    <DetailItem label="Size" value={app.property.grossSqFt ? `${app.property.grossSqFt} SF` : `${app.property.numberOfUnits} Units`} />
                    <DetailItem label="Year Built" value={app.property.yearBuilt} />
                    <DetailItem label="Physical Occupancy" value={app.property.physicalOccupancyPct ? `${app.property.physicalOccupancyPct}%` : null} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm"><CardContent className="py-8 text-center text-gray-500">No property attached.</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6 space-y-6">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-lg">Comments & Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      CU
                    </div>
                    <div className="flex-1 space-y-2">
                      <Textarea 
                        placeholder="Add a comment or underwriting note..." 
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        className="min-h-[100px] resize-none focus-visible:ring-1"
                      />
                      <Button onClick={handleAddComment} disabled={!commentBody.trim() || createCommentMutation.isPending} className="w-full sm:w-auto">
                        <Send className="mr-2 h-4 w-4" /> Post Comment
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    {isCommentsLoading ? <Skeleton className="h-24 w-full" /> : comments?.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-4">No comments yet.</p>
                    ) : (
                      comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100 group">
                          <div className="w-8 h-8 rounded-full bg-sidebar/10 flex items-center justify-center text-sidebar font-bold text-xs shrink-0">
                            {comment.authorName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between mb-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-sm text-gray-900">{comment.authorName}</span>
                                <span className="text-xs text-gray-500">{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteCommentMutation.mutate({ id: id as string, commentId: comment.id })}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6 space-y-6">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button size="sm" onClick={() => uploadDocMutation.mutate({ id: id as string, data: { fileName: "New_Document.pdf", fileType: "application/pdf", uploadedBy: "Current User", category: "Underwriting" }})}>
                    <Activity className="mr-2 h-4 w-4"/> Upload File
                  </Button>
                </CardHeader>
                <CardContent className="pt-0 px-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 font-semibold">File Name</th>
                        <th className="px-6 py-3 font-semibold">Category</th>
                        <th className="px-6 py-3 font-semibold">Size</th>
                        <th className="px-6 py-3 font-semibold">Uploaded</th>
                        <th className="px-6 py-3 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isDocsLoading ? (
                        <tr><td colSpan={5} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td></tr>
                      ) : documents?.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No documents uploaded.</td></tr>
                      ) : (
                        documents?.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary/70" />
                              {doc.fileName}
                            </td>
                            <td className="px-6 py-3 text-gray-600">{doc.category || "Uncategorized"}</td>
                            <td className="px-6 py-3 text-gray-600 font-mono text-xs">{((doc.fileSizeBytes || 0) / 1024).toFixed(1)} KB</td>
                            <td className="px-6 py-3 text-gray-500 text-xs">{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</td>
                            <td className="px-6 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteDocMutation.mutate({ id: id as string, documentId: doc.id })}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, highlight = false }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
      {value ? (
        <p className={`text-sm ${highlight ? 'font-mono text-primary font-bold text-base' : 'text-gray-900 font-medium'}`}>{value}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not specified</p>
      )}
    </div>
  );
}
