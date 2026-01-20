/**
 * BILLING SCREEN
 * 
 * Subscription plans, credit packages, and billing management
 * Integrates with DodoPayments for UPI payments
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { useAuth } from '../context/AuthContext';
import {
    getSubscriptionPlans,
    getCreditPackages,
    getUserCredits,
    getTransactionHistory,
    formatPrice,
    SubscriptionPlan,
    CreditPackage,
    CreditBalance,
    CREDIT_COSTS,
} from '../services/billingService';
import {
    getSubscriptionPaymentUrl,
    getCreditPurchaseUrl,
    DODO_CONFIG,
} from '../services/dodoPaymentsService';

export default function BillingScreen() {
    const { theme, isDark } = useTheme();
    const { horizontalPadding } = useWebStyles();
    const navigation = useNavigation<any>();
    const { user } = useAuth() as { user: { email?: string; name?: string } | null };

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [credits, setCredits] = useState<CreditBalance | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'plans' | 'credits' | 'history'>('plans');

    // Get user email for DodoPayments
    const userEmail = user?.email || '';
    const returnUrl = Platform.OS === 'web'
        ? `${window.location.origin}/billing?success=true`
        : 'upscprep://billing/success';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [plansData, packagesData, creditsData, transactionsData] = await Promise.all([
                getSubscriptionPlans(),
                getCreditPackages(),
                getUserCredits(),
                getTransactionHistory(10),
            ]);
            setPlans(plansData);
            setPackages(packagesData);
            setCredits(creditsData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('[Billing] Load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSubscribe = async (planType: 'basic' | 'pro') => {
        if (!userEmail) {
            Alert.alert('Login Required', 'Please login to subscribe to a plan.');
            return;
        }

        const planName = planType === 'basic' ? 'Basic (₹399/month)' : 'Pro (₹699/month)';
        const monthlyCredits = planType === 'basic' ? 200 : 400;

        // Get product ID
        const productId = planType === 'pro'
            ? 'pdt_0NWfIFkWCMpUGhXYfg4aw'  // Pro Plan
            : 'pdt_0NWfIDvBZePuVfiU5bmom'; // Basic Plan

        // DodoPayments checkout URL
        const paymentUrl = `https://checkout.dodopayments.com/buy/${productId}?email=${encodeURIComponent(userEmail)}&redirect_url=${encodeURIComponent(returnUrl)}`;

        Alert.alert(
            `Subscribe to ${planType === 'basic' ? 'Basic' : 'Pro'} Plan`,
            `${planName}\n\n✓ ${monthlyCredits} AI credits/month\n✓ All AI features\n✓ Cancel anytime\n\nPay with UPI or Card`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '💳 Pay Now',
                    onPress: async () => {
                        console.log('[Billing] Opening payment URL:', paymentUrl);
                        try {
                            const canOpen = await Linking.canOpenURL(paymentUrl);
                            if (canOpen) {
                                await Linking.openURL(paymentUrl);
                            } else {
                                // Fallback: open in browser
                                if (Platform.OS === 'web') {
                                    window.open(paymentUrl, '_blank');
                                } else {
                                    Alert.alert('Error', 'Cannot open payment page. Please try again.');
                                }
                            }
                        } catch (err) {
                            console.error('[Billing] Error opening URL:', err);
                            Alert.alert('Error', 'Failed to open payment page. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleBuyCredits = async (credits: 50 | 120 | 300, packageName: string, price: number) => {
        if (!userEmail) {
            Alert.alert('Login Required', 'Please login to purchase credits.');
            return;
        }

        // Get product ID for credits
        const productMap: Record<number, string> = {
            50: 'pdt_0NWfIIB8YCLeExHJxEp0D',
            120: 'pdt_0NWfIJl53N3g787FepmFP',
            300: 'pdt_0NWfILvFXsCCRNki0ojs6',
        };

        const productId = productMap[credits];
        const paymentUrl = `https://checkout.dodopayments.com/buy/${productId}?email=${encodeURIComponent(userEmail)}&redirect_url=${encodeURIComponent(returnUrl)}`;

        Alert.alert(
            `Buy ${packageName}`,
            `₹${price} for ${credits} credits\n\n✓ Credits never expire\n✓ Use on any AI feature\n\nPay with UPI or Card`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '💳 Pay Now',
                    onPress: async () => {
                        console.log('[Billing] Opening payment URL:', paymentUrl);
                        try {
                            const canOpen = await Linking.canOpenURL(paymentUrl);
                            if (canOpen) {
                                await Linking.openURL(paymentUrl);
                            } else {
                                if (Platform.OS === 'web') {
                                    window.open(paymentUrl, '_blank');
                                } else {
                                    Alert.alert('Error', 'Cannot open payment page. Please try again.');
                                }
                            }
                        } catch (err) {
                            console.error('[Billing] Error opening URL:', err);
                            Alert.alert('Error', 'Failed to open payment page. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const renderCreditsCard = () => (
        <View style={[styles.creditsCard, { backgroundColor: isDark ? '#1E1E2E' : '#fff' }]}>
            <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.creditsGradient}
            >
                <View style={styles.creditsHeader}>
                    <View>
                        <Text style={styles.creditsLabel}>Your Credits</Text>
                        <Text style={styles.creditsNumber}>{credits?.credits || 0}</Text>
                    </View>
                    <View style={styles.creditsBadge}>
                        <Ionicons name="flash" size={20} color="#FFD700" />
                        <Text style={styles.planBadgeText}>
                            {credits?.plan_type === 'pro' ? 'PRO' : credits?.plan_type === 'basic' ? 'BASIC' : 'FREE'}
                        </Text>
                    </View>
                </View>
                {credits?.monthly_credits ? (
                    <Text style={styles.creditsInfo}>
                        {credits.monthly_credits} credits/month • Renews {credits.expires_at ? new Date(credits.expires_at).toLocaleDateString() : 'N/A'}
                    </Text>
                ) : (
                    <Text style={styles.creditsInfo}>Subscribe to get monthly credits</Text>
                )}
            </LinearGradient>
        </View>
    );

    const renderTabs = () => (
        <View style={[styles.tabs, { borderColor: theme.colors.border }]}>
            {['plans', 'credits', 'history'].map((tab) => (
                <TouchableOpacity
                    key={tab}
                    style={[
                        styles.tab,
                        activeTab === tab && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setActiveTab(tab as any)}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === tab ? '#fff' : theme.colors.text }
                    ]}>
                        {tab === 'plans' ? '📋 Plans' : tab === 'credits' ? '⚡ Credits' : '📜 History'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderPlans = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Subscription Plans</Text>

            {plans.map((plan) => {
                const isCurrentPlan = credits?.plan_type === plan.plan_type;
                const isPro = plan.plan_type === 'pro';

                return (
                    <View
                        key={plan.id}
                        style={[
                            styles.planCard,
                            { backgroundColor: isDark ? '#1E1E2E' : '#fff', borderColor: isPro ? '#8B5CF6' : theme.colors.border },
                            isPro && styles.proPlanCard
                        ]}
                    >
                        {isPro && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>MOST POPULAR</Text>
                            </View>
                        )}

                        <View style={styles.planHeader}>
                            <View>
                                <Text style={[styles.planName, { color: theme.colors.text }]}>
                                    {isPro ? '🔵' : '🟢'} {plan.name}
                                </Text>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.planPrice, { color: theme.colors.primary }]}>
                                        {formatPrice(plan.price_inr)}
                                    </Text>
                                    <Text style={[styles.planPeriod, { color: theme.colors.textSecondary }]}>/month</Text>
                                </View>
                            </View>
                            <View style={styles.creditsBox}>
                                <Text style={styles.creditsBoxNumber}>{plan.monthly_credits}</Text>
                                <Text style={styles.creditsBoxLabel}>credits</Text>
                            </View>
                        </View>

                        <View style={styles.featuresBox}>
                            {plan.features.map((feature, i) => (
                                <View key={i} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.limitsRow}>
                            <View style={styles.limitItem}>
                                <Ionicons name="document-text" size={16} color={theme.colors.textSecondary} />
                                <Text style={[styles.limitText, { color: theme.colors.textSecondary }]}>
                                    PDF: {plan.max_pdf_pages} pages
                                </Text>
                            </View>
                            <View style={styles.limitItem}>
                                <Ionicons name="text" size={16} color={theme.colors.textSecondary} />
                                <Text style={[styles.limitText, { color: theme.colors.textSecondary }]}>
                                    Response: {plan.max_response_length}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.subscribeButton,
                                isCurrentPlan && styles.currentPlanButton,
                                isPro && !isCurrentPlan && styles.proSubscribeButton
                            ]}
                            onPress={() => !isCurrentPlan && handleSubscribe(plan.plan_type)}
                            disabled={isCurrentPlan}
                        >
                            <Text style={styles.subscribeButtonText}>
                                {isCurrentPlan ? '✓ Current Plan' : 'Subscribe Now'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );

    const renderCreditsPackages = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>💳 Buy Extra Credits</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                Credits never expire • Use on any feature
            </Text>

            <View style={styles.packagesGrid}>
                {packages.map((pkg) => (
                    <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, { backgroundColor: isDark ? '#1E1E2E' : '#fff', borderColor: theme.colors.border }]}
                        onPress={() => handleBuyCredits(pkg.credits as 50 | 120 | 300, pkg.name, pkg.price_inr)}
                    >
                        <Text style={[styles.packageCredits, { color: theme.colors.primary }]}>{pkg.credits}</Text>
                        <Text style={[styles.packageCreditsLabel, { color: theme.colors.textSecondary }]}>credits</Text>
                        <Text style={[styles.packagePrice, { color: theme.colors.text }]}>{formatPrice(pkg.price_inr)}</Text>
                        <Text style={[styles.packagePer, { color: theme.colors.textSecondary }]}>
                            ₹{(pkg.price_inr / pkg.credits).toFixed(1)}/credit
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Credit Usage Guide */}
            <View style={[styles.usageGuide, { backgroundColor: isDark ? '#1E1E2E' : '#F0F9FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.usageTitle, { color: theme.colors.text }]}>🧠 How Credits Work</Text>
                <View style={styles.usageGrid}>
                    {Object.entries(CREDIT_COSTS).map(([feature, cost]) => (
                        <View key={feature} style={styles.usageItem}>
                            <Text style={[styles.usageFeature, { color: theme.colors.text }]}>
                                {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Text>
                            <Text style={[styles.usageCost, { color: theme.colors.primary }]}>{cost} credit{cost > 1 ? 's' : ''}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderHistory = () => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Transaction History</Text>

            {transactions.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: isDark ? '#1E1E2E' : '#fff' }]}>
                    <Ionicons name="receipt-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No transactions yet</Text>
                </View>
            ) : (
                transactions.map((tx) => (
                    <View key={tx.id} style={[styles.transactionRow, { backgroundColor: isDark ? '#1E1E2E' : '#fff', borderColor: theme.colors.border }]}>
                        <View style={[styles.txIcon, { backgroundColor: tx.credits > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Ionicons
                                name={tx.credits > 0 ? 'add' : 'remove'}
                                size={16}
                                color={tx.credits > 0 ? '#059669' : '#DC2626'}
                            />
                        </View>
                        <View style={styles.txDetails}>
                            <Text style={[styles.txDescription, { color: theme.colors.text }]}>
                                {tx.description || tx.feature_used || tx.transaction_type}
                            </Text>
                            <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>
                                {new Date(tx.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        <Text style={[styles.txCredits, { color: tx.credits > 0 ? '#059669' : '#DC2626' }]}>
                            {tx.credits > 0 ? '+' : ''}{tx.credits}
                        </Text>
                    </View>
                ))
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading billing...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding || 20 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Billing & Credits</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Credits Card */}
                {renderCreditsCard()}

                {/* Tabs */}
                {renderTabs()}

                {/* Content */}
                {activeTab === 'plans' && renderPlans()}
                {activeTab === 'credits' && renderCreditsPackages()}
                {activeTab === 'history' && renderHistory()}

                {/* Payment Info */}
                <View style={[styles.paymentInfo, { borderColor: theme.colors.border }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    <Text style={[styles.paymentInfoText, { color: theme.colors.textSecondary }]}>
                        Secure UPI payments via DodoPayments
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: 14 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
    headerTitle: { fontSize: 20, fontWeight: '700' },

    creditsCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    creditsGradient: { padding: 24 },
    creditsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    creditsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
    creditsNumber: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 4 },
    creditsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    planBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    creditsInfo: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 12 },

    tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabText: { fontSize: 13, fontWeight: '600' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, marginBottom: 16 },

    planCard: { borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, position: 'relative' },
    proPlanCard: { borderColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
    popularBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    popularText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    planName: { fontSize: 18, fontWeight: '700' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
    planPrice: { fontSize: 28, fontWeight: '800' },
    planPeriod: { fontSize: 14, marginLeft: 4 },
    creditsBox: { backgroundColor: '#6366F110', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
    creditsBoxNumber: { fontSize: 24, fontWeight: '800', color: '#6366F1' },
    creditsBoxLabel: { fontSize: 11, color: '#6366F1', fontWeight: '500' },
    featuresBox: { marginBottom: 16 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    featureText: { fontSize: 14, flex: 1 },
    limitsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    limitItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    limitText: { fontSize: 12 },
    subscribeButton: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    proSubscribeButton: { backgroundColor: '#8B5CF6' },
    currentPlanButton: { backgroundColor: '#10B981' },
    subscribeButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    packagesGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    packageCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
    packageCredits: { fontSize: 28, fontWeight: '800' },
    packageCreditsLabel: { fontSize: 12, marginTop: -4 },
    packagePrice: { fontSize: 18, fontWeight: '700', marginTop: 8 },
    packagePer: { fontSize: 11, marginTop: 2 },

    usageGuide: { borderRadius: 16, padding: 16, borderWidth: 1 },
    usageTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
    usageGrid: { gap: 8 },
    usageItem: { flexDirection: 'row', justifyContent: 'space-between' },
    usageFeature: { fontSize: 13 },
    usageCost: { fontSize: 13, fontWeight: '600' },

    emptyState: { padding: 40, alignItems: 'center', borderRadius: 16 },
    emptyText: { marginTop: 12, fontSize: 14 },
    transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
    txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    txDetails: { flex: 1 },
    txDescription: { fontSize: 14, fontWeight: '500' },
    txDate: { fontSize: 12, marginTop: 2 },
    txCredits: { fontSize: 16, fontWeight: '700' },

    paymentInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderTopWidth: 1, marginTop: 20 },
    paymentInfoText: { fontSize: 13 },
});
