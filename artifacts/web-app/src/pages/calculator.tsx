import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCalculateAmortization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator as CalcIcon, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  loanAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  annualRatePct: z.coerce.number().min(0.01, "Rate must be greater than 0"),
  termMonths: z.coerce.number().min(1, "Term must be at least 1 month"),
  amortizationMonths: z.coerce.number().min(1, "Amortization must be at least 1 month"),
  interestOnlyMonths: z.coerce.number().min(0).default(0),
});

export default function Calculator() {
  const [result, setResult] = useState<any>(null);

  const calcMutation = useCalculateAmortization({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanAmount: 5000000,
      annualRatePct: 6.5,
      termMonths: 60,
      amortizationMonths: 300,
      interestOnlyMonths: 12,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    calcMutation.mutate({ data: values });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Amortization Calculator</h1>
          <p className="text-muted-foreground mt-1">Calculate payment schedules for commercial loans.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-gray-50/50 border-b border-border pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalcIcon className="h-5 w-5 text-primary" /> Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="loanAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount ($)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="annualRatePct" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="termMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term (Months)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="amortizationMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amort (Months)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                  <FormField control={form.control} name="interestOnlyMonths" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Only Period (Months)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <Button type="submit" className="w-full mt-4" disabled={calcMutation.isPending}>
                    {calcMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Calculate Schedule
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {result && (
            <Card className="shadow-sm border-border bg-sidebar text-sidebar-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-sidebar-primary-foreground">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <p className="text-sm text-sidebar-foreground/70 mb-1">Monthly Payment (P&I)</p>
                  <p className="text-2xl font-mono font-bold">${result.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div className="pt-3 border-t border-sidebar-accent">
                  <p className="text-sm text-sidebar-foreground/70 mb-1">Total Interest</p>
                  <p className="text-lg font-mono font-medium">${result.totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                {result.balloonPayment && result.balloonPayment > 0 && (
                  <div className="pt-3 border-t border-sidebar-accent">
                    <p className="text-sm text-sidebar-foreground/70 mb-1">Balloon Payment (End of Term)</p>
                    <p className="text-lg font-mono font-bold text-accent">${result.balloonPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8">
          <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="bg-gray-50/50 border-b border-border pb-4 shrink-0">
              <CardTitle className="text-lg">Amortization Schedule</CardTitle>
              <CardDescription>Month by month breakdown of principal and interest.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {result ? (
                <ScrollArea className="h-[600px] w-full rounded-md">
                  <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-500 uppercase bg-white sticky top-0 border-b border-border shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-3 font-semibold text-center">Period</th>
                        <th className="px-6 py-3 font-semibold">Payment</th>
                        <th className="px-6 py-3 font-semibold">Principal</th>
                        <th className="px-6 py-3 font-semibold">Interest</th>
                        <th className="px-6 py-3 font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-xs">
                      {result.schedule.map((row: any) => (
                        <tr key={row.period} className="hover:bg-gray-50/50">
                          <td className="px-6 py-2.5 text-center font-sans font-medium text-gray-500">{row.period}</td>
                          <td className="px-6 py-2.5">${row.payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="px-6 py-2.5">${row.principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="px-6 py-2.5 text-gray-500">${row.interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="px-6 py-2.5 font-medium">${row.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                  <CalcIcon className="h-12 w-12 text-gray-200" />
                  <p>Enter loan parameters and calculate to view the schedule.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
