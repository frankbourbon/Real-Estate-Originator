import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ApplicationsList from "@/pages/applications/index";
import ApplicationDetail from "@/pages/applications/detail";
import NewApplication from "@/pages/applications/new";
import BorrowersList from "@/pages/borrowers/index";
import BorrowerDetail from "@/pages/borrowers/detail";
import NewBorrower from "@/pages/borrowers/new";
import PropertiesList from "@/pages/properties/index";
import PropertyDetail from "@/pages/properties/detail";
import NewProperty from "@/pages/properties/new";
import Calculator from "@/pages/calculator";
import UsersList from "@/pages/users/index";
import NewUser from "@/pages/users/new";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/applications/new" component={NewApplication} />
        <Route path="/applications/:id" component={ApplicationDetail} />
        <Route path="/applications" component={ApplicationsList} />
        <Route path="/borrowers/new" component={NewBorrower} />
        <Route path="/borrowers/:id" component={BorrowerDetail} />
        <Route path="/borrowers" component={BorrowersList} />
        <Route path="/properties/new" component={NewProperty} />
        <Route path="/properties/:id" component={PropertyDetail} />
        <Route path="/properties" component={PropertiesList} />
        <Route path="/calculator" component={Calculator} />
        <Route path="/users/new" component={NewUser} />
        <Route path="/users" component={UsersList} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
