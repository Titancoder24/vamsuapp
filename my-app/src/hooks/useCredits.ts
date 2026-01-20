/**
 * CREDITS HOOK
 * 
 * Manages user credits for AI features:
 * - Fetches credits from Supabase
 * - Deducts credits when using features
 * - Displays credits in header
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canBypassCredits, getDevCredits } from '../utils/devMode';

// Credit costs for each feature
export const CREDIT_COSTS = {
    summary: 1,
    mind_map: 2,
    mcq_generator: 3,
    pdf_mcq: 5,
    essay_evaluation: 3,
};

export type FeatureType = keyof typeof CREDIT_COSTS;

interface UserCredits {
    credits: number;
    plan_type: 'free' | 'basic' | 'pro';
    user_id: string;
    email: string;
}

export function useCredits() {
    const { user } = useAuth() as { user: { id?: string; email?: string } | null };
    const [credits, setCredits] = useState<number>(canBypassCredits() ? getDevCredits() : 0);
    const [planType, setPlanType] = useState<string>(canBypassCredits() ? 'pro' : 'free');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = user?.id;
    const userEmail = user?.email;

    // Fetch credits from Supabase
    const fetchCredits = useCallback(async () => {
        // Dev mode bypass
        if (canBypassCredits()) {
            setCredits(getDevCredits());
            setPlanType('pro');
            setLoading(false);
            return;
        }

        if (!userId && !userEmail) {
            setCredits(0);
            setPlanType('free');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Try to get by user_id first, then by email
            let query = supabase
                .from('user_subscriptions')
                .select('current_credits, plan_type, user_id');

            if (userId) {
                query = query.eq('user_id', userId);
            } else if (userEmail) {
                query = query.eq('user_id', userEmail);
            }

            const { data, error: fetchError } = await query.single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('[Credits] Fetch error:', fetchError);
                setError(fetchError.message);
            }

            if (data) {
                setCredits(data.current_credits || 0);
                setPlanType(data.plan_type || 'free');
            } else {
                // No subscription found - user has 0 credits
                setCredits(0);
                setPlanType('free');
            }
        } catch (err: any) {
            console.error('[Credits] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, userEmail]);

    // Check if user has enough credits for a feature
    const hasEnoughCredits = useCallback((feature: FeatureType): boolean => {
        if (canBypassCredits()) return true; // Dev mode bypass
        const cost = CREDIT_COSTS[feature];
        return credits >= cost;
    }, [credits]);

    // Deduct credits for using a feature
    const useCredits = useCallback(async (feature: FeatureType): Promise<boolean> => {
        // Dev mode bypass - no deduction needed
        if (canBypassCredits()) {
            console.log(`[DEV] Bypassing credit deduction for ${feature}`);
            return true;
        }

        const cost = CREDIT_COSTS[feature];

        if (credits < cost) {
            Alert.alert(
                'Insufficient Credits',
                `You need ${cost} credits for ${feature.replace('_', ' ')}. You have ${credits} credits.\n\nPurchase more credits to continue.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Buy Credits', onPress: () => {
                            // Navigate to billing - handled by the caller
                        }
                    },
                ]
            );
            return false;
        }

        try {
            const identifier = userId || userEmail;
            if (!identifier) return false;

            // Deduct credits in Supabase
            const { error: updateError } = await supabase
                .from('user_subscriptions')
                .update({
                    current_credits: credits - cost,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', identifier);

            if (updateError) {
                console.error('[Credits] Update error:', updateError);
                Alert.alert('Error', 'Failed to deduct credits. Please try again.');
                return false;
            }

            // Log transaction
            await supabase.from('credit_transactions').insert({
                user_id: identifier,
                transaction_type: 'usage',
                credits: -cost,
                balance_after: credits - cost,
                feature_used: feature,
                description: `Used ${cost} credits for ${feature.replace('_', ' ')}`,
            });

            // Update local state
            setCredits(prev => prev - cost);
            console.log(`[Credits] Used ${cost} credits for ${feature}. Remaining: ${credits - cost}`);

            return true;
        } catch (err: any) {
            console.error('[Credits] Deduction error:', err);
            Alert.alert('Error', 'Failed to process credit usage.');
            return false;
        }
    }, [credits, userId, userEmail]);

    // Check credits before allowing feature access
    const checkFeatureAccess = useCallback((feature: FeatureType, onNavigateToBilling: () => void): boolean => {
        const cost = CREDIT_COSTS[feature];

        if (!userId && !userEmail) {
            Alert.alert(
                'Login Required',
                'Please login to use AI features.',
                [{ text: 'OK' }]
            );
            return false;
        }

        if (credits < cost) {
            Alert.alert(
                'Insufficient Credits',
                `This feature requires ${cost} credits.\nYou have ${credits} credits.\n\nBuy more credits to continue.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Buy Credits', onPress: onNavigateToBilling },
                ]
            );
            return false;
        }

        return true;
    }, [credits, userId, userEmail]);

    // Fetch credits on mount and when user changes
    useEffect(() => {
        fetchCredits();
    }, [fetchCredits]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!userId && !userEmail) return;

        const identifier = userId || userEmail;

        const subscription = supabase
            .channel('credits-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_subscriptions',
                    filter: `user_id=eq.${identifier}`,
                },
                (payload) => {
                    console.log('[Credits] Realtime update:', payload);
                    if (payload.new?.current_credits !== undefined) {
                        setCredits(payload.new.current_credits);
                    }
                    if (payload.new?.plan_type) {
                        setPlanType(payload.new.plan_type);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId, userEmail]);

    return {
        credits,
        planType,
        loading,
        error,
        hasEnoughCredits,
        useCredits,
        checkFeatureAccess,
        refreshCredits: fetchCredits,
        CREDIT_COSTS,
    };
}

export default useCredits;
