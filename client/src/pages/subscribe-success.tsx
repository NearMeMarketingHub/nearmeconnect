import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import logoImage from "@assets/near-me-connect-logo-nobg.png";

export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <img src={logoImage} alt="Near Me Connect" className="h-8 object-contain" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-success-heading">
              Payment successful!
            </h1>
            <p className="text-muted-foreground" data-testid="text-success-message">
              We're setting up your portal now. You'll receive a welcome email with your login details within the next few minutes.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
              <Mail className="h-4 w-4 shrink-0" />
              <span>Check your inbox — including spam/junk folders.</span>
            </div>
            <Link href="/auth">
              <Button className="w-full mt-2" data-testid="button-go-to-login">
                Go to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
