/**
 * BILLING & CREDITS SERVICE
 * 
 * Handles subscription management, credit purchases, and usage tracking
 * Integrates with DodoPayments for UPI payments
 */

import { supabase } from '../lib/supabase';

// ===================== TYPES =====================
export interface SubscriptionPlan {
    id: string;
    name: string;
    plan_type: 'basic' | 'pro';
    price_inr: number;
    monthly_credits: number;
    features: string[];
    max_response_length: 'medium' | 'long';
    max_pdf_pages: number;
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price_inr: number;
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_type: 'basic' | 'pro' | 'free';
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    price_inr: number;
    monthly_credits: number;
    current_credits: number;
    expires_at: string | null;
}

export interface CreditBalance {
    has_subscription: boolean;
    plan_type: string;
    credits: number;
    monthly_credits: number;
    expires_at: string | null;
    status: string;
}

// ===================== CREDIT COSTS =====================
export const CREDIT_COSTS = {
    summary: 1,
    mind_map: 2,
    mcq_generator: 3,
    pdf_mcq: 5,  // Average of 4-6
    essay_evaluation: 3,
} as const;

export type FeatureType = keyof typeof CREDIT_COSTS;

// ===================== API FUNCTIONS =====================

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_inr');

    if (error) throw error;
    return data || [];
}

/**
 * Get all available credit packages
 */
export async function getCreditPackages(): Promise<CreditPackage[]> {
    const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('price_inr');

    if (error) throw error;
    return data || [];
}

/**
 * Get user's current subscription and credits
 */
export async function getUserCredits(): Promise<CreditBalance> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            has_subscription: false,
            plan_type: 'none',
            credits: 0,
            monthly_credits: 0,
            expires_at: null,
            status: 'none'
        };
    }

    const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: user.id
    });

    if (error) {
        console.error('[Billing] Error getting credits:', error);
        return {
            has_subscription: false,
            plan_type: 'none',
            credits: 0,
            monthly_credits: 0,
            expires_at: null,
            status: 'none'
        };
    }

    return data;
}

/**
 * Check if user has enough credits for a feature
 */
export async function checkCredits(feature: FeatureType): Promise<{
    hasCredits: boolean;
    currentCredits: number;
    requiredCredits: number;
    planType: string;
}> {
    const balance = await getUserCredits();
    const requiredCredits = CREDIT_COSTS[feature];

    return {
        hasCredits: balance.credits >= requiredCredits,
        currentCredits: balance.credits,
        requiredCredits,
        planType: balance.plan_type
    };
}

/**
 * Deduct credits for using a feature
 */
export async function useCredits(
    feature: FeatureType,
    description?: string
): Promise<{ success: boolean; balance: number; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, balance: 0, error: 'Not authenticated' };
    }

    const credits = CREDIT_COSTS[feature];

    const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_credits: credits,
        p_feature: feature,
        p_description: description || `Used ${feature}`
    });

    if (error) {
        console.error('[Billing] Error deducting credits:', error);
        return { success: false, balance: 0, error: error.message };
    }

    return data;
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(limit = 20) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[Billing] Error getting transactions:', error);
        return [];
    }

    return data || [];
}

/**
 * Get user's payment history
 */
export async function getPaymentHistory(limit = 20) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[Billing] Error getting payment history:', error);
        return [];
    }

    return data || [];
}

/**
 * Create checkout URL for subscription via DodoPayments
 */
export async function createSubscriptionCheckout(planType: 'basic' | 'pro'): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const plans = await getSubscriptionPlans();
    const plan = plans.find(p => p.plan_type === planType);

    if (!plan) throw new Error('Plan not found');

    // DodoPayments checkout URL
    // In production, this would call your backend which calls DodoPayments API
    const checkoutParams = new URLSearchParams({
        product_id: plan.id,
        amount: plan.price_inr.toString(),
        currency: 'INR',
        customer_email: user.email || '',
        customer_id: user.id,
        plan_type: planType,
        return_url: 'upscprep://billing/success',
        cancel_url: 'upscprep://billing/cancel',
    });

    // This would be your DodoPayments checkout URL
    return `https://checkout.dodopayments.com/?${checkoutParams.toString()}`;
}

/**
 * Create checkout URL for credit purchase via DodoPayments
 */
export async function createCreditCheckout(packageId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const packages = await getCreditPackages();
    const pkg = packages.find(p => p.id === packageId);

    if (!pkg) throw new Error('Package not found');

    // DodoPayments checkout URL
    const checkoutParams = new URLSearchParams({
        product_id: pkg.id,
        amount: pkg.price_inr.toString(),
        currency: 'INR',
        customer_email: user.email || '',
        customer_id: user.id,
        credits: pkg.credits.toString(),
        type: 'credits',
        return_url: 'upscprep://billing/success',
        cancel_url: 'upscprep://billing/cancel',
    });

    return `https://checkout.dodopayments.com/?${checkoutParams.toString()}`;
}

/**
 * Handle successful payment webhook (called from backend)
 */
export async function handlePaymentSuccess(
    userId: string,
    paymentType: 'subscription' | 'credits',
    paymentId: string,
    planType?: string,
    credits?: number
): Promise<void> {
    if (paymentType === 'subscription' && planType) {
        const plans = await getSubscriptionPlans();
        const plan = plans.find(p => p.plan_type === planType);

        if (plan) {
            // Create or update subscription
            await supabase.from('user_subscriptions').upsert({
                user_id: userId,
                plan_type: planType,
                status: 'active',
                price_inr: plan.price_inr,
                monthly_credits: plan.monthly_credits,
                current_credits: plan.monthly_credits,
                dodo_subscription_id: paymentId,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            // Log payment
            await supabase.from('payment_history').insert({
                user_id: userId,
                payment_type: 'subscription',
                amount_inr: plan.price_inr,
                status: 'completed',
                dodo_payment_id: paymentId,
                plan_type: planType,
            });
        }
    } else if (paymentType === 'credits' && credits) {
        // Add credits
        await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_credits: credits,
            p_transaction_type: 'purchase',
            p_payment_id: paymentId,
            p_description: `Purchased ${credits} credits`
        });
    }
}

/**
 * Format price for display
 */
export function formatPrice(priceInr: number): string {
    return `₹${priceInr.toLocaleString('en-IN')}`;
}

/**
 * Get feature display name
 */
export function getFeatureDisplayName(feature: FeatureType): string {
    const names: Record<FeatureType, string> = {
        summary: 'AI Summary',
        mind_map: 'Mind Map',
        mcq_generator: 'MCQ Generator',
        pdf_mcq: 'PDF to MCQ',
        essay_evaluation: 'Essay Evaluation'
    };
    return names[feature];
}
