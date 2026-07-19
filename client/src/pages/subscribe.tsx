import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import logoImage from "@assets/near-me-connect-logo-nobg.png";

const PLAN_INFO: Record<string, { name: string; price: number; highlights: string[] }> = {
  starter: {
    name: "Starter",
    price: 69,
    highlights: ["Task management", "Campaigns & meetings", "Team collaboration", "Chat & media uploads"],
  },
  growth: {
    name: "Growth",
    price: 89,
    highlights: ["Everything in Starter", "Credit system", "Credit usage tracking"],
  },
  pro: {
    name: "Pro",
    price: 99,
    highlights: ["Everything in Growth", "Reporting & analytics", "Credit store"],
  },
};

const schema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function SubscribePage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "starter";
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.starter;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          companyName: values.companyName,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/pricing">
            <img src={logoImage} alt="Near Me Connect" className="h-8 object-contain" />
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to pricing
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Plan summary */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">You're signing up for</p>
              <h1 className="text-3xl font-bold">{planInfo.name} Plan</h1>
              <p className="text-2xl font-semibold text-orange-500 mt-1">${planInfo.price}/month</p>
            </div>
            <ul className="space-y-2">
              {planInfo.highlights.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              You'll be redirected to Stripe to complete your payment securely.
              After payment, your account will be created and login details sent to your email.
            </p>
          </div>

          {/* Signup form */}
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Fill in your details to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Marketing"
                    data-testid="input-company-name"
                    {...form.register("companyName")}
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      data-testid="input-first-name"
                      {...form.register("firstName")}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      data-testid="input-last-name"
                      {...form.register("lastName")}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@acme.com"
                    data-testid="input-email"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="8+ characters"
                    data-testid="input-password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    data-testid="input-confirm-password"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2" data-testid="text-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading}
                  data-testid="button-submit-signup"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                  ) : (
                    "Continue to payment"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth" className="underline underline-offset-4 hover:text-foreground">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
