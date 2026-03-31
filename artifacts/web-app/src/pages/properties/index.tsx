import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProperties } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState<string>("all");
  
  const { data: properties, isLoading } = useListProperties({
    ...(search ? { search } : {}),
    ...(propertyType !== "all" ? { propertyType } : {})
  } as any);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <Link href="/properties/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <Plus className="mr-2 h-4 w-4" />
          New Property
        </Link>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search properties by address..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Multifamily">Multifamily</SelectItem>
              <SelectItem value="Retail">Retail</SelectItem>
              <SelectItem value="Office">Office</SelectItem>
              <SelectItem value="Industrial">Industrial</SelectItem>
              <SelectItem value="Mixed Use">Mixed Use</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="rounded-md border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Address</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Size</th>
                <th className="px-6 py-4 font-semibold">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : properties?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 bg-white">No properties found.</td>
                </tr>
              ) : (
                properties?.map((property) => (
                  <tr 
                    key={property.id} 
                    className="bg-white hover:bg-gray-50 transition-colors cursor-pointer" 
                    onClick={() => setLocation(`/properties/${property.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{property.streetAddress}</td>
                    <td className="px-6 py-4 text-gray-600">{property.city}, {property.state} {property.zipCode}</td>
                    <td className="px-6 py-4 text-gray-600">{property.propertyType}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {property.grossSqFt ? `${property.grossSqFt} SF` : 
                       property.numberOfUnits ? `${property.numberOfUnits} Units` : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{property.physicalOccupancyPct ? `${property.physicalOccupancyPct}%` : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
