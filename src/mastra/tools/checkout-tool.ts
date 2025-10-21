import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  items: CartItem[];
  total: number;
  date: string;
  status: string;
}

export const checkoutTool = createTool({
  id: 'checkout',
  description: `Process checkout for the current cart. This generates an order confirmation, 
  calculates the total, creates an order ID, and moves items from cart to order history.
  Use this when the user is ready to complete their purchase.`,
  inputSchema: z.object({
    confirmCheckout: z.boolean().default(true).describe('Confirm that user wants to proceed with checkout'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    order: z.object({
      orderId: z.string(),
      items: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          quantity: z.number(),
          price: z.number(),
        })
      ),
      subtotal: z.number(),
      tax: z.number(),
      total: z.number(),
      date: z.string(),
      status: z.string(),
    }).optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const { confirmCheckout } = context;
    
    if (!confirmCheckout) {
      return {
        success: false,
        message: 'Checkout cancelled by user',
      };
    }
    
    // Get current working memory (cart state)
    // Working memory is automatically managed by Mastra and passed through runtimeContext
    const runtimeAny = runtimeContext as any;
    const workingMemory = (runtimeAny.workingMemory || { cart: [], orders: [] }) as { 
      cart: CartItem[];
      orders: Order[];
    };
    
    const cart: CartItem[] = [...(workingMemory.cart || [])];
    const orders: Order[] = [...(workingMemory.orders || [])];
    try {
      console.log('[checkoutTool] start', {
        cartLength: cart.length,
        ordersLength: orders.length,
        wmKeys: Object.keys(workingMemory || {}),
      });
    } catch {}
    
    // Check if cart is empty
    if (cart.length === 0) {
      return {
        success: false,
        message: 'Cannot checkout with an empty cart. Please add items to your cart first.',
      };
    }
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Generate order ID (timestamp-based)
    const orderId = `ORD-${Date.now()}`;
    const orderDate = new Date().toISOString();
    
    // Create order object
    const order: Order = {
      orderId,
      items: [...cart], // Copy cart items
      total,
      date: orderDate,
      status: 'confirmed',
    };
    
    // Add order to order history
    orders.push(order);
    
    // Clear cart after successful checkout
    const emptyCart: CartItem[] = [];
    
    // Update working memory with cleared cart and new order - preserve existing memory fields
    runtimeAny.workingMemory = {
      ...workingMemory,
      cart: emptyCart,
      orders,
    };
    try {
      console.log('[checkoutTool] after checkout', {
        newCartLength: emptyCart.length,
        ordersLength: orders.length,
        lastOrderId: orderId,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      });
    } catch {}
    
    return {
      success: true,
      message: `Order placed successfully! Your order ID is ${orderId}`,
      order: {
        orderId,
        items: cart,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        date: orderDate,
        status: 'confirmed',
      },
    };
  },
});

