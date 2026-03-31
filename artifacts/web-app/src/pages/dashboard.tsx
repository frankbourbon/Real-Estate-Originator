import { useGetDashboardSummary, useGetPipelineBreakdown, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetPipelineBreakdown();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Volume" value={summary?.totalLoanVolume ? `$${(summary.totalLoanVolume / 1000000).toFixed(1)}M` : "$0M"} icon={Building2} isLoading={isLoadingSummary} />
        <MetricCard title="Active Applications" value={summary?.totalApplications} icon={Activity} isLoading={isLoadingSummary} />
        <MetricCard title="Avg DSCR" value={summary?.avgDSCR?.toFixed(2)} icon={CheckCircle2} isLoading={isLoadingSummary} />
        <MetricCard title="Avg LTV" value={summary?.avgLTV ? `${summary.avgLTV.toFixed(1)}%` : "0%"} icon={AlertCircle} isLoading={isLoadingSummary} />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full text-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(val) => `$${val/1000000}M`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar yAxisId="left" dataKey="totalVolume" name="Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="count" name="Count" fill="hsl(var(--sidebar-accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{item.action}</p>
                      <p className="text-gray-500">{item.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(item.timestamp), 'MMM d, h:mm a')} • {item.userName}</p>
                    </div>
                  </div>
                ))}
                {!activity?.length && <div className="text-gray-500 text-sm py-4">No recent activity.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, isLoading }: any) {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold text-gray-900">{value}</div>}
      </CardContent>
    </Card>
  );
}
