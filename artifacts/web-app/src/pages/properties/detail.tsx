import { useParams } from "wouter";
import { useGetProperty, useUpdateProperty } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Ruler, Users, Calendar, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function PropertyDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: property, isLoading } = useGetProperty(id as string, {
    query: { enabled: !!id }
  });

  const updateMutation = useUpdateProperty({
    mutation: {
      onSuccess: () => {
        toast({ title: "Property Updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/properties", id] });
      }
    }
  });

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!property) return <div>Property not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {property.streetAddress}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4" /> {property.city}, {property.state} {property.zipCode}
          </p>
        </div>
        <Button variant="outline" onClick={() => updateMutation.mutate({ id: id as string, data: { propertyType: property.propertyType }})}>
          <Edit className="h-4 w-4 mr-2" /> Edit Property
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border md:col-span-2">
          <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
            <CardTitle className="text-lg">Property Characteristics</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-y-8 gap-x-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Building2 className="h-4 w-4" /><span className="text-xs uppercase font-medium tracking-wide">Type</span></div>
              <p className="font-semibold text-gray-900">{property.propertyType}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Ruler className="h-4 w-4" /><span className="text-xs uppercase font-medium tracking-wide">Gross Area</span></div>
              <p className="font-semibold text-gray-900">{property.grossSqFt ? `${property.grossSqFt} SF` : "N/A"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Building2 className="h-4 w-4" /><span className="text-xs uppercase font-medium tracking-wide">Units/Beds</span></div>
              <p className="font-semibold text-gray-900">{property.numberOfUnits || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Calendar className="h-4 w-4" /><span className="text-xs uppercase font-medium tracking-wide">Year Built</span></div>
              <p className="font-semibold text-gray-900">{property.yearBuilt || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border md:col-span-1">
          <CardHeader className="pb-3 border-b border-border bg-gray-50/50">
            <CardTitle className="text-lg">Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-500">Physical</span>
                <span className="font-bold">{property.physicalOccupancyPct || "0"}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${property.physicalOccupancyPct || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-500">Economic</span>
                <span className="font-bold">{property.economicOccupancyPct || "0"}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sidebar-accent rounded-full" 
                  style={{ width: `${property.economicOccupancyPct || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
