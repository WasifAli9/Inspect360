import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Shield, Eye, FileCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUserSchema, loginUserSchema, type RegisterUser, type LoginUser } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { loginMutation, registerMutation, user } = useAuth();
  const [, navigate] = useLocation();

  const loginForm = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterUser>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "clerk",
    },
  });

  async function handleLogin(data: LoginUser) {
    const result = await loginMutation.mutateAsync(data);
    if (result) {
      navigate("/dashboard");
    }
  }

  async function handleRegister(data: RegisterUser) {
    const result = await registerMutation.mutateAsync(data);
    if (result) {
      navigate("/onboarding");
    }
  }

  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Left Column - Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {isLogin ? "Welcome back" : "Create account"}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? "Enter your credentials to access your account"
                  : "Fill in your details to create your Inspect360 account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-username"
                              placeholder="Enter your username"
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-password"
                              placeholder="Enter your password"
                              disabled={loginMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => navigate("/forgot-password")}
                        data-testid="button-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                data-testid="input-first-name"
                                placeholder="John"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                data-testid="input-last-name"
                                placeholder="Doe"
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              data-testid="input-email"
                              placeholder="john@example.com"
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-register-username"
                              placeholder="johndoe"
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              data-testid="input-register-password"
                              placeholder="Create a strong password"
                              disabled={registerMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={registerMutation.isPending}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="owner">Owner Operator</SelectItem>
                              <SelectItem value="clerk">Inventory Clerk</SelectItem>
                              <SelectItem value="compliance">Compliance Officer</SelectItem>
                              <SelectItem value="tenant">Tenant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </Form>
              )}

              <div className="text-center text-sm">
                {isLogin ? (
                  <p className="text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setIsLogin(false)}
                      data-testid="button-switch-register"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setIsLogin(true)}
                      data-testid="button-switch-login"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Hero */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-12 relative overflow-hidden">
        {/* Navy gradient background */}
        <div className="absolute inset-0 bg-[#003764]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#003764] via-[#000092]/20 to-[#59B677]/10"></div>

        {/* Content */}
        <div className="relative z-10 max-w-lg space-y-8 text-white">
          <div>
            <h1 className="text-4xl font-bold mb-4">AI-Powered Building Inspections</h1>
            <p className="text-lg text-white/90">
              Streamline your Build-to-Rent operations with mobile-first inspections, AI photo analysis, and comprehensive compliance tracking.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-[#59B677] p-3 rounded-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Photo Analysis</h3>
                <p className="text-sm text-white/80">
                  Powered by GPT-5 Vision for detailed condition assessments
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-[#59B677] p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Offline Mobile Inspections</h3>
                <p className="text-sm text-white/80">
                  Conduct field inspections without internet connectivity
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-[#59B677] p-3 rounded-lg">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Compliance Tracking</h3>
                <p className="text-sm text-white/80">
                  Automated expiry alerts for certifications and licenses
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-[#59B677] p-3 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Role-Based Access</h3>
                <p className="text-sm text-white/80">
                  Secure access for owners, clerks, compliance officers, and tenants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
