"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    credits: 10,
    features: ["10 images/month", "Standard quality", "Public gallery", "Basic styles"],
    current: true,
    gradient: "from-gray-400 to-gray-500",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    credits: 500,
    features: ["500 images/month", "High & Ultra quality", "Private gallery", "All styles", "Priority generation"],
    current: false,
    gradient: "from-violet-400 to-blue-400",
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "per month",
    credits: 5000,
    features: ["Unlimited images", "All quality levels", "API access", "Custom styles", "Dedicated support", "Team accounts"],
    current: false,
    gradient: "from-amber-400 to-orange-400",
  },
];

export default function AccountPage() {
  const usedCredits = 7;
  const totalCredits = 10;
  const usagePercent = (usedCredits / totalCredits) * 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Account</h1>
        <p className="text-muted-foreground">Manage your profile, credits, and subscription</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border w-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative size-16 overflow-hidden rounded-full ring-2 ring-violet-500/50">
                    <Image
                      src="https://picsum.photos/seed/avatar/128/128"
                      alt="Avatar"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Alex Johnson</p>
                    <p className="text-sm text-muted-foreground">alex@example.com</p>
                    <Badge variant="secondary" className="mt-1 bg-secondary text-secondary-foreground">
                      Free Plan
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="display-name" className="text-xs uppercase text-muted-foreground">
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      defaultValue="Alex Johnson"
                      className="border-border bg-input/30 text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs uppercase text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue="alex@example.com"
                      className="border-border bg-input/30 text-foreground"
                    />
                  </div>
                  <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0">
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Credits Card */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Credits &amp; Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{usedCredits}</p>
                    <p className="text-sm text-muted-foreground">of {totalCredits} credits used</p>
                  </div>
                  <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0">
                    Buy More
                  </Button>
                </div>
                <Progress value={usagePercent} className="h-3 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-blue-500" />
                <p className="text-xs text-muted-foreground">{totalCredits - usedCredits} credits remaining this month</p>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="border-border bg-card md:col-span-2">
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Total Generated", value: "47", icon: "🖼️" },
                    { label: "This Month", value: "7", icon: "📅" },
                    { label: "Text to Image", value: "35", icon: "✍️" },
                    { label: "Image Edits", value: "12", icon: "✏️" },
                  ].map((stat) => (
                    <Card key={stat.label} className="border-border bg-secondary/30 text-center">
                      <CardContent className="p-4">
                        <div className="mb-2 text-2xl">{stat.icon}</div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Choose Your Plan</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border transition-all ${
                  plan.current
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-border bg-card hover:border-violet-500/40"
                }`}
              >
                {plan.current && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Current Plan
                  </span>
                )}
                <CardContent className="p-6">
                  <div className={`mb-1 bg-gradient-to-r ${plan.gradient} bg-clip-text text-lg font-bold text-transparent`}>
                    {plan.name}
                  </div>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{plan.credits} credits/month</p>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <svg className="h-4 w-4 flex-shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.current
                        ? "border border-violet-500/50 bg-transparent text-violet-300 hover:bg-transparent cursor-default"
                        : `bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90 border-0`
                    }`}
                    disabled={plan.current}
                  >
                    {plan.current ? "Current Plan" : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
