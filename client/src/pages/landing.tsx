import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BarChart3, Users, CheckCircle, Sparkles } from "lucide-react";
import logoImage from "@assets/LogoNewMedium_1768860762303.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Near Me Connect" className="h-10 w-auto" />
              <span className="text-lg font-bold tracking-tight">Near Me Connect</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild data-testid="button-login">
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight mb-6">
              Your Marketing Partner Portal
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track your credits, manage tasks, and collaborate with our team. 
              Everything you need to keep your marketing moving forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/auth">Get Started</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No complicated hourly tracking. No surprise invoices.
            </p>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">
              Why Clients Love the Credit System
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                  <p className="text-muted-foreground text-sm">
                    Know exactly how your credits are being used. No hidden fees or unclear boundaries.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Flexibility</h3>
                  <p className="text-muted-foreground text-sm">
                    Priorities change week-to-week? No problem. The credit system adapts with you.
                  </p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Predictability</h3>
                  <p className="text-muted-foreground text-sm">
                    Fixed monthly retainer means no bloated invoices or unexpected costs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>Near Me Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
