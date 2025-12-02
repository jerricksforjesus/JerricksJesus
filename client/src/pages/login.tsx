import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Home, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error") === "not_registered" ? "register" : "login";
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    
    if (error === "not_registered") {
      toast({
        title: "Account not found",
        description: "You need to register first before signing in with Google. Please use the Register tab to create an account.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    } else if (error === "auth_failed") {
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

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
        description: "Please check your credentials. If you don't have an account yet, click the Register tab to create one.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!registerEmail || !emailRegex.test(registerEmail)) {
      toast({ 
        title: "Invalid email", 
        description: "Please enter a valid email address.",
        variant: "destructive" 
      });
      return;
    }
    
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
      await register(registerUsername, registerEmail, registerPassword);
      // Automatically log in after successful registration
      await login(registerUsername, registerPassword);
      toast({ title: "Welcome!", description: "Your account has been created and you're now signed in." });
      setLocation("/admin");
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username or Email</Label>
                  <Input
                    id="login-username"
                    data-testid="input-login-username"
                    type="text"
                    placeholder="Enter your username or email"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      data-testid="input-login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="pr-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showLoginPassword ? (
                        <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                      ) : (
                        <><Eye className="w-4 h-4 mr-1" /> Show</>
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  data-testid="button-login"
                  className="w-full font-medium mt-6"
                  disabled={isLoading}
                  style={{ 
                    backgroundColor: "#b47a5f",
                    color: "#ffffff"
                  }}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "/api/auth/google"}
                  data-testid="button-google-login"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
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
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    data-testid="input-register-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
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
                  className="w-full font-medium mt-6"
                  disabled={isLoading}
                  style={{ 
                    backgroundColor: "#b47a5f",
                    color: "#ffffff"
                  }}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "/api/auth/google"}
                  data-testid="button-google-register"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </Button>
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
