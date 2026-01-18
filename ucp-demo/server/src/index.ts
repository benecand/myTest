import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock Database
const products = [
    { id: 'tv-1', name: 'Samsung TV 4K', price: 1200, currency: 'USD' }
];

let checkoutSessions: any[] = [];

// 1. UCP Discovery Endpoint
app.get('/.well-known/ucp', (req: Request, res: Response) => {
    res.json({
        ucp: {
            version: '2026-01-11',
            services: {
                'dev.ucp.shopping': {
                    version: '2026-01-11',
                    spec: 'https://ucp.dev/specs/shopping',
                    rest: {
                        schema: 'https://ucp.dev/services/shopping/openapi.json',
                        endpoint: `http://localhost:${PORT}/`
                    }
                }
            },
            capabilities: [
                {
                    name: 'dev.ucp.shopping.checkout',
                    version: '2026-01-11',
                    spec: 'https://ucp.dev/specs/shopping/checkout',
                    schema: 'https://ucp.dev/schemas/shopping/checkout.json'
                }
            ]
        },
        business: {
            name: 'Samsung TV Store',
            id: 'merchant-123'
        }
    });
});

// Mock product search
app.get('/search', (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (query && query.toLowerCase().includes('samsung')) {
        return res.json(products);
    }
    res.json([]);
});

// 2. UCP Checkout Session API
app.post('/checkout-sessions', (req: Request, res: Response) => {
    const { line_items, buyer, currency = 'USD' } = req.body;

    const sessionId = `sess_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate totals according to UCP (array of amounts)
    const subtotal = line_items.reduce((sum: number, li: any) => sum + (li.item.price * li.quantity), 0);

    const newSession = {
        id: sessionId,
        status: 'ready_for_complete',
        line_items: line_items.map((li: any) => ({
            id: `li_${Math.random().toString(36).substr(2, 5)}`,
            item: li.item,
            quantity: li.quantity,
            totals: [
                { type: 'subtotal', amount: li.item.price * li.quantity, currency }
            ]
        })),
        buyer,
        currency,
        totals: [
            { type: 'subtotal', amount: subtotal, currency },
            { type: 'total', amount: subtotal, currency }
        ],
        created_at: new Date().toISOString()
    };

    checkoutSessions.push(newSession);
    res.status(201).json(newSession);
});

// Finalize Purchase (Order Capability)
app.post('/checkout-sessions/:id/complete', (req: Request, res: Response) => {
    const session = checkoutSessions.find(s => s.id === req.params.id);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.status = 'completed';

    // Return an Order object
    const order = {
        id: `ord_${Math.random().toString(36).substr(2, 9)}`,
        checkout_id: session.id,
        line_items: session.line_items,
        buyer: session.buyer,
        currency: session.currency,
        totals: session.totals,
        status: 'placed',
        fulfillment: {
            status: 'pending'
        }
    };

    res.json(order);
});

app.listen(PORT, () => {
    console.log(`UCP Mock Server running at http://localhost:${PORT}`);
});
