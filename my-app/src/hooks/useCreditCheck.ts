/**
 * CREDIT CHECK HOOK
 * 
 * Hook to check and consume credits before using AI features
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    checkCredits,
    useCredits,
    getUserCredits,
    CREDIT_COSTS,
    FeatureType,
    getFeatureDisplayName,
    CreditBalance,
} from '../services/billingService';

export interface UseCreditCheckResult {
    loading: boolean;
    credits: number;
    planType: string;
    hasCredits: (feature: FeatureType) => Promise<boolean>;
    consumeCredits: (feature: FeatureType, description?: string) => Promise<boolean>;
    showInsufficientCreditsAlert: (feature: FeatureType) => void;
    refreshCredits: () => Promise<void>;
    getCreditCost: (feature: FeatureType) => number;
}

export function useCreditCheck(): UseCreditCheckResult {
    const [loading, setLoading] = useState(false);
    const [credits, setCredits] = useState(0);
    const [planType, setPlanType] = useState('free');
    const navigation = useNavigation<any>();

    const refreshCredits = useCallback(async () => {
        try {
            const balance = await getUserCredits();
            setCredits(balance.credits);
            setPlanType(balance.plan_type);
        } catch (error) {
            console.error('[CreditCheck] Refresh error:', error);
        }
    }, []);

    const hasCredits = useCallback(async (feature: FeatureType): Promise<boolean> => {
        setLoading(true);
        try {
            const result = await checkCredits(feature);
            setCredits(result.currentCredits);
            setPlanType(result.planType);
            return result.hasCredits;
        } catch (error) {
            console.error('[CreditCheck] Check error:', error);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const consumeCredits = useCallback(async (feature: FeatureType, description?: string): Promise<boolean> => {
        setLoading(true);
        try {
            // First check if user has enough credits
            const check = await checkCredits(feature);

            if (!check.hasCredits) {
                showInsufficientCreditsAlert(feature);
                return false;
            }

            // Consume the credits
            const result = await useCredits(feature, description);

            if (result.success) {
                setCredits(result.balance);
                return true;
            } else {
                Alert.alert('Error', result.error || 'Failed to use credits');
                return false;
            }
        } catch (error: any) {
            console.error('[CreditCheck] Consume error:', error);
            Alert.alert('Error', error.message || 'Failed to process credits');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const showInsufficientCreditsAlert = useCallback((feature: FeatureType) => {
        const featureName = getFeatureDisplayName(feature);
        const cost = CREDIT_COSTS[feature];

        Alert.alert(
            'Insufficient Credits',
            `${featureName} requires ${cost} credit${cost > 1 ? 's' : ''}.\n\nYou have ${credits} credits remaining.\n\nUpgrade your plan or buy more credits to continue.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Get Credits',
                    onPress: () => navigation.navigate('Billing'),
                },
            ]
        );
    }, [credits, navigation]);

    const getCreditCost = useCallback((feature: FeatureType): number => {
        return CREDIT_COSTS[feature];
    }, []);

    return {
        loading,
        credits,
        planType,
        hasCredits,
        consumeCredits,
        showInsufficientCreditsAlert,
        refreshCredits,
        getCreditCost,
    };
}

/**
 * Credit Badge Component
 * Shows current credits in the header
 */
export function CreditBadge({
    credits,
    onPress,
    size = 'small',
}: {
    credits: number;
    onPress?: () => void;
    size?: 'small' | 'large';
}) {
    const isSmall = size === 'small';

    return null; // Implement as a component in actual usage
}
