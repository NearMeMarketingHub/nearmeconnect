import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import logoImage from "@assets/near-me-connect-logo-nobg.png";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  tier: string;
  name: string;
  price: number;
  description: string;
  recommended?: boolean;
  features: PlanFeature[];
}

const plans: Plan[] = [
  {
    tier: "starter",
    name: "Starter",
    price: 69,
    description: "A complete task portal for your agency",
    features: [
      { text: "Task management & tracking", included: true },
      { text: "Team collaboration", included: true },
      { text: "Campaign management", included: true },
      { text: "Meetings & calendar", included: true },
      { text: "Training resources", included: true },
      { text: "Media uploads", included: true },
      { text: "Chat & messaging", included: true },
      { text: "Credit system", included: false },
      { text: "Reporting & analytics", included: false },
      { text: "Credit store", included: false },
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    price: 89,
    description: "Add credit tracking to your workflow",
    recommended: true,
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Credit system", included: true },
      { text: "Credit usage tracking", included: true },
      { text: "Task credit deductions", included: true },
      { text: "Reporting & analytics", included: false },
      { text: "Credit store", included: false },
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: 99,
    description: "Full access — nothing held back",
    features: [
      { text: "Everything in Growth", included: true },
      { text: "Reporting & analytics", included: true },
      { text: "Credit store", included: true },
      { text: "Buy additional credits", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={logoImage} alt="Near Me Connect" className="h-8 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" size="sm" data-testid="link-signin">Sign in</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-16 px-6">
        <Badge variant="secondary" className="mb-4">Simple pricing</Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          One portal, three tiers
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Start with just the tasks. Add credits and reporting as your agency grows.
          No setup fees, cancel anytime.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-xl border bg-card p-6 flex flex-col ${
                plan.recommended
                  ? "border-orange-500 shadow-lg shadow-orange-500/10"
                  : "border-border"
              }`}
              data-testid={`plan-card-${plan.tier}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white border-0 px-3 py-0.5 text-xs">
                    Most popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground mb-1">/mo</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground/60"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={`/subscribe?plan=${plan.tier}`}>
                <Button
                  className={`w-full ${plan.recommended ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                  variant={plan.recommended ? "default" : "outline"}
                  data-testid={`button-get-started-${plan.tier}`}
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Custom / Enterprise note */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          Need a custom plan or government portal?{" "}
          <a href="mailto:hello@nearmemarketinghub.com" className="underline underline-offset-4 hover:text-foreground">
            Contact us
          </a>
        </p>
      </section>
    </div>
  );
}
