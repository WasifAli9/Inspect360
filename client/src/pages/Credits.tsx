import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Plus, Minus, RefreshCw, AlertCircle, Zap, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/LocaleContext";
import type { CreditBundle } from "@shared/schema";

interface AutoRenewSettings {
  enabled: boolean;
  bundleId: string | null;
  threshold: number;
  lastRunAt: string | null;
  failureCount: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
}

export default function Credits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const locale = useLocale();
  const [selectedCredits, setSelectedCredits] = useState(10);

  const { data: organization } = useQuery<{ creditsRemaining: number | null }>({
    queryKey: ["/api/organizations", user?.organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${user?.organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
    enabled: !!user?.organizationId,
  });

  const { data: transactions = [] } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credits/transactions"],
  });

  const { data: bundles = [] } = useQuery<CreditBundle[]>({
    queryKey: ["/api/credits/bundles"],
  });

  const { data: autoRenewSettings, isLoading: isLoadingAutoRenew } = useQuery<AutoRenewSettings>({
    queryKey: ["/api/credits/auto-renew"],
  });

  const [autoRenewEnabled, setAutoRenewEnabled] = useState(false);
  const [autoRenewBundleId, setAutoRenewBundleId] = useState<string>("");
  const [autoRenewThreshold, setAutoRenewThreshold] = useState(10);

  useEffect(() => {
    if (autoRenewSettings) {
      setAutoRenewEnabled(autoRenewSettings.enabled);
      setAutoRenewBundleId(autoRenewSettings.bundleId || "");
      setAutoRenewThreshold(autoRenewSettings.threshold);
    }
  }, [autoRenewSettings]);

  const checkout = useMutation({
    mutationFn: async (credits: number) => {
      return await apiRequest("/api/stripe/create-checkout", "POST", { credits });
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const updateAutoRenew = useMutation({
    mutationFn: async (settings: { enabled: boolean; bundleId: string | null; threshold: number }) => {
      return await apiRequest("/api/credits/auto-renew", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits/auto-renew"] });
      toast({
        title: "Auto-Renew Updated",
        description: autoRenewEnabled 
          ? "Auto-renew has been enabled for your account" 
          : "Auto-renew has been disabled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-renew settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveAutoRenew = () => {
    if (autoRenewEnabled && !autoRenewBundleId) {
      toast({
        title: "Select a Bundle",
        description: "Please select a credit bundle for auto-renewal",
        variant: "destructive",
      });
      return;
    }
    updateAutoRenew.mutate({
      enabled: autoRenewEnabled,
      bundleId: autoRenewEnabled ? autoRenewBundleId : null,
      threshold: autoRenewThreshold,
    });
  };

  const creditOptions = [
    { amount: 10, price: 10, popular: false },
    { amount: 50, price: 45, popular: true, discount: "10% off" },
    { amount: 100, price: 80, popular: false, discount: "20% off" },
  ];

  const creditsRemaining = organization?.creditsRemaining ?? 0;
  const isOwner = user?.role === "owner";
  const selectedBundle = bundles.find(b => b.id === autoRenewBundleId);

  const hasUnsavedChanges = autoRenewSettings && (
    autoRenewEnabled !== autoRenewSettings.enabled ||
    autoRenewBundleId !== (autoRenewSettings.bundleId || "") ||
    autoRenewThreshold !== autoRenewSettings.threshold
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inspection Credits</h1>
        <p className="text-muted-foreground">Manage your AI analysis credits</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary" data-testid="text-credits-balance">
            {creditsRemaining} credits
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Each credit allows for one AI photo analysis or comparison
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Purchase Credits</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {creditOptions.map((option) => (
            <Card
              key={option.amount}
              className={`relative ${
                option.popular ? "border-accent border-2" : ""
              }`}
            >
              {option.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-center">
                  {option.amount} Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{locale.formatCurrency(option.price, false)}</div>
                  {option.discount && (
                    <Badge variant="secondary" className="mt-2">
                      {option.discount}
                    </Badge>
                  )}
                </div>
                <Button
                  className="w-full bg-primary"
                  onClick={() => checkout.mutate(option.amount)}
                  disabled={checkout.isPending}
                  data-testid={`button-purchase-${option.amount}`}
                >
                  Purchase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Auto-Renew Credits
            </CardTitle>
            <CardDescription>
              Automatically purchase credits when your balance drops below a threshold
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-renew-toggle" className="text-base font-medium">
                  Enable Auto-Renew
                </Label>
                <p className="text-sm text-muted-foreground">
                  Credits will be purchased automatically when running low
                </p>
              </div>
              <Switch
                id="auto-renew-toggle"
                checked={autoRenewEnabled}
                onCheckedChange={setAutoRenewEnabled}
                data-testid="toggle-auto-renew"
              />
            </div>

            {autoRenewEnabled && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-medium">Credit Bundle</Label>
                  <Select value={autoRenewBundleId} onValueChange={setAutoRenewBundleId}>
                    <SelectTrigger data-testid="select-auto-renew-bundle">
                      <SelectValue placeholder="Select a bundle to auto-purchase" />
                    </SelectTrigger>
                    <SelectContent>
                      {bundles.length === 0 ? (
                        <SelectItem value="none" disabled>No bundles available</SelectItem>
                      ) : (
                        bundles.map((bundle) => (
                          <SelectItem key={bundle.id} value={bundle.id}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{bundle.name} - {bundle.credits} credits</span>
                              <span className="text-muted-foreground">
                                {locale.formatCurrency(bundle.priceGbp / 100, false)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedBundle && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-4 h-4 text-primary" />
                      <span>
                        {selectedBundle.credits} credits for {locale.formatCurrency(selectedBundle.priceGbp / 100, false)}
                        {selectedBundle.discountLabel && (
                          <Badge variant="secondary" className="ml-2">{selectedBundle.discountLabel}</Badge>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Low Balance Threshold</Label>
                    <span className="text-sm font-medium text-primary">{autoRenewThreshold} credits</span>
                  </div>
                  <Slider
                    value={[autoRenewThreshold]}
                    onValueChange={(value) => setAutoRenewThreshold(value[0])}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                    data-testid="slider-auto-renew-threshold"
                  />
                  <p className="text-sm text-muted-foreground">
                    Auto-purchase will trigger when your balance drops below {autoRenewThreshold} credits
                  </p>
                </div>

                {autoRenewSettings?.lastRunAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>
                      Last auto-renewal: {new Date(autoRenewSettings.lastRunAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {autoRenewSettings?.failureCount && autoRenewSettings.failureCount > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {autoRenewSettings.failureCount} failed attempt(s). Please check your payment method.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={handleSaveAutoRenew}
                disabled={updateAutoRenew.isPending || !hasUnsavedChanges}
                data-testid="button-save-auto-renew"
              >
                {updateAutoRenew.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    {transaction.amount > 0 ? (
                      <Plus className="w-4 h-4 text-accent" />
                    ) : (
                      <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      transaction.amount > 0 ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
