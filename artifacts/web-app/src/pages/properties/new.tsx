import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useCreateProperty } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  streetAddress: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP is required"),
  propertyType: z.string().min(1, "Type is required"),
  grossSqFt: z.string().optional(),
  numberOfUnits: z.string().optional(),
  yearBuilt: z.string().optional(),
  physicalOccupancyPct: z.string().optional(),
  economicOccupancyPct: z.string().optional(),
});

export default function NewProperty() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createMutation = useCreateProperty({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Property Created", description: "The property has been successfully created." });
        setLocation(`/properties/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create property.", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      propertyType: "",
      grossSqFt: "",
      numberOfUnits: "",
      yearBuilt: "",
      physicalOccupancyPct: "",
      economicOccupancyPct: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({ data: values });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Property</h1>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-gray-50/50 border-b border-border">
          <CardTitle className="text-lg">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="streetAddress" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="zipCode" render={({ field }) => (
                    <FormItem><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-semibold mb-4 text-gray-900">Characteristics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="propertyType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Multifamily">Multifamily</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Industrial">Industrial</SelectItem>
                          <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                    <FormItem><FormLabel>Year Built</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="grossSqFt" render={({ field }) => (
                    <FormItem><FormLabel>Gross Sq Ft</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="numberOfUnits" render={({ field }) => (
                    <FormItem><FormLabel>Number of Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="physicalOccupancyPct" render={({ field }) => (
                    <FormItem><FormLabel>Physical Occupancy (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="economicOccupancyPct" render={({ field }) => (
                    <FormItem><FormLabel>Economic Occupancy (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setLocation("/properties")} className="mr-4">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Property
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
