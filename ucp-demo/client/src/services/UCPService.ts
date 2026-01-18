
export interface Product {
    id: string;
    name: string;
    price: number;
    currency: string;
}

export interface UCPCapabilities {
    name: string;
    version: string;
    spec: string;
    schema: string;
}

export interface UCPProfile {
    ucp: {
        version: string;
        services: {
            [key: string]: {
                version: string;
                spec: string;
                rest: {
                    schema: string;
                    endpoint: string;
                };
            };
        };
        capabilities: UCPCapabilities[];
    };
    business: {
        name: string;
        id: string;
    };
}

export interface CheckoutSession {
    id: string;
    status: string;
    line_items: any[];
    totals: { type: string; amount: number; currency: string }[];
}

export interface Order {
    id: string;
    checkout_id: string;
    status: string;
    totals: { type: string; amount: number; currency: string }[];
}

class UCPService {
    private baseUrl = 'http://localhost:3001';

    async discover(): Promise<UCPProfile> {
        const response = await fetch(`${this.baseUrl}/.well-known/ucp`);
        if (!response.ok) throw new Error('Discovery failed');
        return response.json();
    }

    async search(query: string): Promise<Product[]> {
        const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        return response.json();
    }

    async createCheckoutSession(endpoint: string, line_items: any[], buyer: any): Promise<CheckoutSession> {
        const response = await fetch(`${endpoint}checkout-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line_items, buyer })
        });
        if (!response.ok) throw new Error('Checkout session creation failed');
        return response.json();
    }

    async completeCheckout(endpoint: string, sessionId: string): Promise<Order> {
        const response = await fetch(`${endpoint}checkout-sessions/${sessionId}/complete`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Checkout completion failed');
        return response.json();
    }
}

export const ucpService = new UCPService();
