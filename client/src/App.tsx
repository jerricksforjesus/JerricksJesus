import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LiveStream from "@/pages/live";
import Replays from "@/pages/replays";
import AdminDashboard from "@/pages/admin";
import LoginPage from "@/pages/login";
import Events from "@/pages/events";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/live" component={LiveStream}/>
      <Route path="/replays" component={Replays}/>
      <Route path="/events" component={Events}/>
      <Route path="/admin" component={AdminDashboard}/>
      <Route path="/login" component={LoginPage}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
