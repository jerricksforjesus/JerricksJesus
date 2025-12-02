import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Home } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    setLocation("/admin");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(loginUsername, loginPassword);
      toast({ title: "Welcome back!", description: "You have been logged in successfully." });
      setLocation("/admin");
    } catch (error: any) {
      toast({ 
        title: "Login failed", 
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "Please make sure your passwords match.",
        variant: "destructive" 
      });
      return;
    }
    
    if (registerPassword.length < 6) {
      toast({ 
        title: "Password too short", 
        description: "Password must be at least 6 characters.",
        variant: "destructive" 
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(registerUsername, registerPassword);
      toast({ title: "Account created!", description: "Please login with your new account." });
      setLoginUsername(registerUsername);
      setRegisterUsername("");
      setRegisterPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ 
        title: "Registration failed", 
        description: error.message || "Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, var(--alabaster) 0%, var(--paper-cream) 100%)" }}
    >
      <Button
        variant="ghost"
        onClick={() => setLocation("/")}
        className="mb-6 self-center"
        data-testid="button-back-to-home-top"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Main Site
      </Button>
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle 
            className="text-3xl font-serif"
            style={{ color: "var(--burnt-clay)" }}
          >
            Jerricks for Jesus
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to access the church portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    data-testid="input-login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    data-testid="input-login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  data-testid="button-login"
                  className="w-full"
                  disabled={isLoading}
                  style={{ 
                    color: "#b47a5f",
                    borderColor: "#b47a5f",
                    border: "1px solid #b47a5f"
                  }}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    data-testid="input-register-username"
                    type="text"
                    placeholder="Choose a username"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    data-testid="input-register-password"
                    type="password"
                    placeholder="Create a password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  data-testid="button-register"
                  className="w-full"
                  disabled={isLoading}
                  style={{ 
                    color: "#b47a5f",
                    borderColor: "#b47a5f",
                    border: "1px solid #b47a5f"
                  }}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
                <p className="text-sm text-center text-muted-foreground mt-4">
                  New members will have regular access. Contact an admin for elevated permissions.
                </p>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              data-testid="link-back-home"
              onClick={() => setLocation("/")}
              className="text-sm"
            >
              <Home className="w-4 h-4 mr-1" />
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
