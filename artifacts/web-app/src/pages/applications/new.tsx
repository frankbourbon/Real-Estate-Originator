import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useCreateApplication, useListBorrowers, useListProperties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  borrowerId: z.string().min(1, "Borrower is required"),
  propertyId: z.string().min(1, "Property is required"),
  loanType: z.string().min(1, "Loan Type is required"),
  loanAmountUsd: z.string().min(1, "Amount is required"),
  loanTermYears: z.string().optional(),
  interestType: z.string().optional(),
  amortizationType: z.string().optional(),
  ltvPct: z.string().optional(),
  dscrRatio: z.string().optional(),
});

export default function NewApplication() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: borrowers } = useListBorrowers();
  const { data: properties } = useListProperties();
  
  const createMutation = useCreateApplication({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Application Created", description: "The loan application has been successfully created." });
        setLocation(`/applications/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create application.", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      borrowerId: "",
      propertyId: "",
      loanType: "",
      loanAmountUsd: "",
      loanTermYears: "",
      interestType: "",
      amortizationType: "",
      ltvPct: "",
      dscrRatio: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({ data: values });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Application</h1>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-gray-50/50 border-b border-border">
          <CardTitle className="text-lg">Loan Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="borrowerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Borrower</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a borrower" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {borrowers?.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.firstName} {b.lastName} {b.entityName ? `(${b.entityName})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.streetAddress}, {p.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="loanAmountUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.0. 5000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Acquisition">Acquisition</SelectItem>
                          <SelectItem value="Refinance">Refinance</SelectItem>
                          <SelectItem value="Construction">Construction</SelectItem>
                          <SelectItem value="Bridge">Bridge</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interestType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Fixed">Fixed</SelectItem>
                          <SelectItem value="Adjustable">Adjustable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanTermYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ltvPct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target LTV (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g. 65" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dscrRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target DSCR</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g. 1.25" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/applications")}
                  className="mr-4"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Application
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
