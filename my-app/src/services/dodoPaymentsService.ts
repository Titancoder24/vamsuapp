/**
 * DODO PAYMENTS SERVICE
 * 
 * Integration with DodoPayments for subscription and credit billing
 * Uses meter-based billing for AI credit consumption
 * 
 * API Endpoints:
 * - Test: https://test.dodopayments.com
 * - Live: https://live.dodopayments.com
 */

// ===================== CONFIGURATION =====================
const DODO_CONFIG = {
    // Use test mode for development, live for production
    API_URL: 'https://test.dodopayments.com',  // Change to live.dodopayments.com for production

    // Actual Product IDs from DodoPayments
    PRODUCTS: {
        BASIC_PLAN: 'pdt_0NWfIDvBZePuVfiU5bmom',    // ₹399/month - 200 credits
        PRO_PLAN: 'pdt_0NWfIFkWCMpUGhXYfg4aw',      // ₹699/month - 400 credits
        CREDITS_50: 'pdt_0NWfIIB8YCLeExHJxEp0D',    // ₹99 - 50 credits
        CREDITS_120: 'pdt_0NWfIJl53N3g787FepmFP',   // ₹199 - 120 credits
        CREDITS_300: 'pdt_0NWfILvFXsCCRNki0ojs6',   // ₹399 - 300 credits
    },

    // Business ID
    BUSINESS_ID: 'bus_0NWdKs3BLzg0nKRSCQD1L',

    // Meter ID for tracking AI credit usage
    METER_ID: 'mtr_ai_credits',

    // Event name for credit consumption
    EVENT_NAME: 'ai.credit.used',
};

// ===================== TYPES =====================
interface DodoCustomer {
    customer_id: string;
    email: string;
    name?: string;
}

interface DodoPaymentLink {
    payment_link: string;
    payment_id: string;
}

interface DodoSubscription {
    subscription_id: string;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    current_period_end: string;
}

interface DodoEvent {
    event_id: string;
    customer_id: string;
    event_name: string;
    metadata?: Record<string, any>;
    timestamp?: string;
}

// ===================== API HELPER =====================
async function dodoFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<any> {
    const apiKey = process.env.EXPO_PUBLIC_DODO_API_KEY || '';

    if (!apiKey) {
        throw new Error('DodoPayments API key not configured');
    }

    const response = await fetch(`${DODO_CONFIG.API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `DodoPayments API error: ${response.status}`);
    }

    return response.json();
}

// ===================== CUSTOMER MANAGEMENT =====================

/**
 * Create or get a DodoPayments customer
 */
export async function getOrCreateCustomer(
    email: string,
    name?: string,
    userId?: string
): Promise<DodoCustomer> {
    try {
        // Try to find existing customer
        const customers = await dodoFetch(`/customers?email=${encodeURIComponent(email)}`);

        if (customers.data?.length > 0) {
            return customers.data[0];
        }

        // Create new customer
        const customer = await dodoFetch('/customers', {
            method: 'POST',
            body: JSON.stringify({
                email,
                name,
                metadata: { supabase_user_id: userId },
            }),
        });

        return customer;
    } catch (error) {
        console.error('[Dodo] Customer error:', error);
        throw error;
    }
}

// ===================== SUBSCRIPTION MANAGEMENT =====================

/**
 * Create checkout link for subscription
 */
export async function createSubscriptionCheckout(
    customerId: string,
    planType: 'basic' | 'pro',
    returnUrl: string
): Promise<DodoPaymentLink> {
    const productId = planType === 'pro'
        ? DODO_CONFIG.PRODUCTS.PRO_PLAN
        : DODO_CONFIG.PRODUCTS.BASIC_PLAN;

    const checkout = await dodoFetch('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({
            customer_id: customerId,
            product_id: productId,
            billing_currency: 'INR',
            payment_method_types: ['upi', 'card'],
            return_url: returnUrl,
            metadata: {
                plan_type: planType,
            },
        }),
    });

    return checkout;
}

/**
 * Create checkout link for one-time credit purchase
 */
export async function createCreditPurchaseCheckout(
    customerId: string,
    credits: 50 | 120 | 300,
    returnUrl: string
): Promise<DodoPaymentLink> {
    const productMap = {
        50: DODO_CONFIG.PRODUCTS.CREDITS_50,
        120: DODO_CONFIG.PRODUCTS.CREDITS_120,
        300: DODO_CONFIG.PRODUCTS.CREDITS_300,
    };

    const checkout = await dodoFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer_id: customerId,
            product_id: productMap[credits],
            billing_currency: 'INR',
            payment_method_types: ['upi', 'card'],
            return_url: returnUrl,
            metadata: {
                credits_amount: credits,
                type: 'credit_purchase',
            },
        }),
    });

    return checkout;
}

/**
 * Get customer's active subscription
 */
export async function getActiveSubscription(
    customerId: string
): Promise<DodoSubscription | null> {
    try {
        const subscriptions = await dodoFetch(`/subscriptions?customer_id=${customerId}&status=active`);

        if (subscriptions.data?.length > 0) {
            return subscriptions.data[0];
        }
        return null;
    } catch (error) {
        console.error('[Dodo] Subscription fetch error:', error);
        return null;
    }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
    subscriptionId: string
): Promise<void> {
    await dodoFetch(`/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
    });
}

// ===================== METER & USAGE TRACKING =====================

/**
 * Send usage event to DodoPayments meter
 * This tracks AI credit consumption
 */
export async function trackCreditUsage(
    customerId: string,
    credits: number,
    feature: string,
    metadata?: Record<string, any>
): Promise<void> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await dodoFetch('/events/ingest', {
        method: 'POST',
        body: JSON.stringify({
            events: [{
                event_id: eventId,
                customer_id: customerId,
                event_name: DODO_CONFIG.EVENT_NAME,
                timestamp: new Date().toISOString(),
                metadata: {
                    credits_used: credits,
                    feature,
                    ...metadata,
                },
            }],
        }),
    });

    console.log(`[Dodo] Tracked ${credits} credits for ${feature}`);
}

/**
 * Get customer's current usage for billing period
 */
export async function getCurrentUsage(
    customerId: string
): Promise<{ credits_used: number; credits_remaining: number }> {
    try {
        const usage = await dodoFetch(`/usage/customer/${customerId}`);

        return {
            credits_used: usage.total_usage || 0,
            credits_remaining: usage.credits_remaining || 0,
        };
    } catch (error) {
        console.error('[Dodo] Usage fetch error:', error);
        return { credits_used: 0, credits_remaining: 0 };
    }
}

// ===================== WEBHOOK HANDLERS =====================

/**
 * Handle DodoPayments webhook events
 * Call this from your webhook endpoint
 */
export function handleWebhook(
    event: { type: string; data: any }
): { action: string; data: any } {
    switch (event.type) {
        case 'subscription.created':
            return {
                action: 'provision_subscription',
                data: {
                    customerId: event.data.customer_id,
                    subscriptionId: event.data.subscription_id,
                    planType: event.data.metadata?.plan_type,
                    credits: event.data.metadata?.plan_type === 'pro' ? 400 : 200,
                },
            };

        case 'subscription.renewed':
            return {
                action: 'renew_credits',
                data: {
                    customerId: event.data.customer_id,
                    credits: event.data.metadata?.plan_type === 'pro' ? 400 : 200,
                },
            };

        case 'subscription.cancelled':
            return {
                action: 'cancel_subscription',
                data: {
                    customerId: event.data.customer_id,
                    subscriptionId: event.data.subscription_id,
                },
            };

        case 'payment.completed':
            if (event.data.metadata?.type === 'credit_purchase') {
                return {
                    action: 'add_credits',
                    data: {
                        customerId: event.data.customer_id,
                        credits: event.data.metadata.credits_amount,
                        paymentId: event.data.payment_id,
                    },
                };
            }
            return { action: 'none', data: {} };

        default:
            return { action: 'none', data: {} };
    }
}

// ===================== OVERLAY CHECKOUT =====================

/**
 * Generate overlay checkout script for web
 */
export function getOverlayCheckoutScript(): string {
    return `
    <script src="https://cdn.dodopayments.com/overlay.js"></script>
    <script>
      window.DodoCheckout = {
        open: function(options) {
          DodoOverlay.checkout({
            paymentLink: options.paymentLink,
            theme: 'light',
            onSuccess: function(data) {
              window.postMessage({ type: 'DODO_SUCCESS', data }, '*');
            },
            onCancel: function() {
              window.postMessage({ type: 'DODO_CANCEL' }, '*');
            }
          });
        }
      };
    </script>
  `;
}

// ===================== DIRECT PAYMENT LINK =====================

/**
 * Get direct payment link URL for subscription
 * Uses DodoPayments checkout page with product ID
 */
export function getSubscriptionPaymentUrl(
    planType: 'basic' | 'pro',
    email: string,
    returnUrl: string
): string {
    const productId = planType === 'pro'
        ? DODO_CONFIG.PRODUCTS.PRO_PLAN
        : DODO_CONFIG.PRODUCTS.BASIC_PLAN;

    // DodoPayments checkout URL format
    const baseUrl = 'https://checkout.dodopayments.com/buy';
    const params = new URLSearchParams({
        product_id: productId,
        email: email,
        redirect_url: returnUrl,
        quantity: '1',
    });

    return `${baseUrl}/${productId}?${params.toString()}`;
}

/**
 * Get direct payment link URL for credit purchase
 */
export function getCreditPurchaseUrl(
    credits: 50 | 120 | 300,
    email: string,
    returnUrl: string
): string {
    const productMap = {
        50: DODO_CONFIG.PRODUCTS.CREDITS_50,
        120: DODO_CONFIG.PRODUCTS.CREDITS_120,
        300: DODO_CONFIG.PRODUCTS.CREDITS_300,
    };

    const productId = productMap[credits];
    const baseUrl = 'https://checkout.dodopayments.com/buy';
    const params = new URLSearchParams({
        product_id: productId,
        email: email,
        redirect_url: returnUrl,
        quantity: '1',
    });

    return `${baseUrl}/${productId}?${params.toString()}`;
}

export { DODO_CONFIG };
