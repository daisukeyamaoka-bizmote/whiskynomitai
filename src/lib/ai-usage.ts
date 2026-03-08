import { SupabaseClient } from "@supabase/supabase-js";

const FREE_MONTHLY_LIMIT = 3;

export interface AiUsageStatus {
  canUse: boolean;
  isPremium: boolean;
  usedThisMonth: number;
  remaining: number;
  plan: string;
}

export async function checkAiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<AiUsageStatus> {
  // Check subscription
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .single();

  const isPremium =
    subscription?.plan === "premium" &&
    subscription?.status === "active" &&
    (!subscription?.current_period_end ||
      new Date(subscription.current_period_end) > new Date());

  if (isPremium) {
    return {
      canUse: true,
      isPremium: true,
      usedThisMonth: 0,
      remaining: Infinity,
      plan: "premium",
    };
  }

  // Count this month's usage for free users
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const usedThisMonth = count || 0;
  const remaining = Math.max(FREE_MONTHLY_LIMIT - usedThisMonth, 0);

  return {
    canUse: usedThisMonth < FREE_MONTHLY_LIMIT,
    isPremium: false,
    usedThisMonth,
    remaining,
    plan: "free",
  };
}

export async function logAiUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: string
): Promise<void> {
  await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    feature,
  });
}
