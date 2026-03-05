"use client";

import { useState } from "react";
import Image from "next/image";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    credits: 10,
    features: ["10 images/month", "Standard quality", "Public gallery", "Basic styles"],
    current: true,
    gradient: "from-gray-600 to-gray-700",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    credits: 500,
    features: ["500 images/month", "High & Ultra quality", "Private gallery", "All styles", "Priority generation"],
    current: false,
    gradient: "from-violet-600 to-blue-600",
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "per month",
    credits: 5000,
    features: ["Unlimited images", "All quality levels", "API access", "Custom styles", "Dedicated support", "Team accounts"],
    current: false,
    gradient: "from-amber-500 to-orange-600",
  },
];

export default function AccountPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "billing">("overview");

  const usedCredits = 7;
  const totalCredits = 10;
  const usagePercent = (usedCredits / totalCredits) * 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Account</h1>
        <p className="text-gray-400">Manage your profile, credits, and subscription</p>
      </div>

      {/* Section tabs */}
      <div className="mb-8 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:max-w-xs">
        {(["overview", "billing"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all ${
              activeSection === section
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {activeSection === "overview" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Profile</h2>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-violet-500/50">
                <Image
                  src="https://picsum.photos/seed/avatar/128/128"
                  alt="Avatar"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div>
                <p className="font-semibold text-white">Alex Johnson</p>
                <p className="text-sm text-gray-400">alex@example.com</p>
                <span className="mt-1 inline-block rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300">
                  Free Plan
                </span>
              </div>
            </div>
            <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 uppercase">Display Name</label>
                <input
                  defaultValue="Alex Johnson"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 uppercase">Email</label>
                <input
                  defaultValue="alex@example.com"
                  type="email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <button className="mt-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-violet-500 hover:to-blue-500">
                Save Changes
              </button>
            </div>
          </div>

          {/* Credits Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Credits & Usage</h2>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{usedCredits}</p>
                <p className="text-sm text-gray-400">of {totalCredits} credits used</p>
              </div>
              <button className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-violet-500 hover:to-blue-500">
                Buy More
              </button>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">{totalCredits - usedCredits} credits remaining this month</p>
          </div>

          {/* Statistics */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">Usage Statistics</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Generated", value: "47", icon: "🖼️" },
                { label: "This Month", value: "7", icon: "📅" },
                { label: "Text to Image", value: "35", icon: "✍️" },
                { label: "Image Edits", value: "12", icon: "✏️" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                  <div className="mb-2 text-2xl">{stat.icon}</div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="mb-6 text-lg font-semibold text-white">Choose Your Plan</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 transition-all ${
                  plan.current
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-white/5 hover:border-violet-500/40"
                }`}
              >
                {plan.current && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Current Plan
                  </span>
                )}
                <div className={`mb-1 bg-gradient-to-r ${plan.gradient} bg-clip-text text-lg font-bold text-transparent`}>
                  {plan.name}
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-gray-400">/{plan.period}</span>
                </div>
                <p className="mb-4 text-sm text-gray-500">{plan.credits} credits/month</p>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="h-4 w-4 flex-shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    plan.current
                      ? "border border-violet-500/50 text-violet-300 cursor-default"
                      : `bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90`
                  }`}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
