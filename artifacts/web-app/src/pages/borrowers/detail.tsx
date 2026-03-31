import { useParams } from "wouter";
import { useGetBorrower, useUpdateBorrower } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, Building, Phone, Mail, MapPin, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BorrowerDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: borrower, isLoading } = useGetBorrower(id as string, {
    query: { enabled: !!id }
  });

  const updateMutation = useUpdateBorrower({
    mutation: {
      onSuccess: () => {
        toast({ title: "Borrower Updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/borrowers", id] });
      }
    }
  });

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!borrower) return <div>Borrower not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {borrower.firstName} {borrower.lastName}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Building className="h-4 w-4" /> {borrower.entityName || "Individual"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => updateMutation.mutate({ id: id as string, data: { firstName: borrower.firstName, lastName: borrower.lastName }})}>
          <Edit className="h-4 w-4 mr-2" /> Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{borrower.email || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{borrower.phone || "Not provided"}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-gray-900">
                {borrower.mailingAddress ? (
                  <>
                    {borrower.mailingAddress}<br/>
                    {borrower.city}, {borrower.state} {borrower.zipCode}
                  </>
                ) : "Not provided"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
            <CardTitle className="text-lg">Financial Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-2 gap-y-6 gap-x-4">
            <DetailItem label="Net Worth" value={borrower.netWorthUsd ? `$${Number(borrower.netWorthUsd).toLocaleString()}` : null} />
            <DetailItem label="Liquidity" value={borrower.liquidityUsd ? `$${Number(borrower.liquidityUsd).toLocaleString()}` : null} />
            <DetailItem label="Credit Score" value={borrower.creditScore} />
            <div className="col-span-2">
              <DetailItem label="CRE Experience" value={borrower.creExperienceYears ? `${borrower.creExperienceYears} Years` : null} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">{label}</p>
      {value ? (
        <p className="text-sm font-medium text-gray-900">{value}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not specified</p>
      )}
    </div>
  );
}
