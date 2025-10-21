import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// Load products to validate cart operations
function loadProducts(): Product[] {
  try {
    // Try multiple paths to support both dev and compiled environments
    const paths = [
      join(process.cwd(), 'src', 'mastra', 'data', 'products.json'),
      join(process.cwd(), '..', '..', 'src', 'mastra', 'data', 'products.json'),
      join(process.cwd(), '..', '..', '..', 'src', 'mastra', 'data', 'products.json'),
    ];
    
    for (const productsPath of paths) {
      try {
        const productsData = readFileSync(productsPath, 'utf-8');
        return JSON.parse(productsData);
      } catch {
        // Try next path
        continue;
      }
    }
    
    throw new Error('Products file not found in any expected location');
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}

export const cartTool = createTool({
  id: 'cart-management',
  description: `Manage shopping cart operations: add items, remove items, update quantities, view cart, or clear cart.
  This tool accesses and updates the user's cart stored in working memory.`,
  inputSchema: z.object({
    action: z.enum(['add', 'remove', 'update', 'view', 'clear']).describe('Cart action to perform'),
    productId: z.string().optional().describe('Product ID for add/remove/update actions'),
    quantity: z.number().optional().default(1).describe('Quantity for add/update actions (default: 1)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    cart: z.array(
      z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    ).optional(),
    cartTotal: z.number().optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const { action, productId, quantity = 1 } = context;
    
    // Get current working memory (cart state)
    // Working memory is automatically managed by Mastra and passed through runtimeContext
    const runtimeAny = runtimeContext as any;
    const workingMemory = (runtimeAny.workingMemory || { cart: [], orders: [] }) as { 
      cart: CartItem[]; 
      orders: any[] 
    };
    let cart: CartItem[] = [...(workingMemory.cart || [])];
    
    // Debug: entry state
    try {
      console.log('[cartTool] start', {
        action,
        productId,
        quantity,
        initialCartLength: cart.length,
        wmKeys: Object.keys(workingMemory || {}),
      });
    } catch {}

    const products = loadProducts();
    
    switch (action) {
      case 'add': {
        if (!productId) {
          return {
            success: false,
            message: 'Product ID is required for add action',
            cart,
          };
        }
        
        // Find product in catalog
        const product = products.find(p => p.id === productId);
        if (!product) {
          return {
            success: false,
            message: `Product with ID "${productId}" not found`,
            cart,
          };
        }
        
        // Check stock availability
        if (product.stock < quantity) {
          return {
            success: false,
            message: `Only ${product.stock} units available for ${product.name}`,
            cart,
          };
        }
        
        // Check if item already in cart
        const existingItemIndex = cart.findIndex(item => item.productId === productId);
        
        if (existingItemIndex >= 0) {
          // Update quantity
          const newQuantity = cart[existingItemIndex].quantity + quantity;
          if (newQuantity > product.stock) {
            return {
              success: false,
              message: `Cannot add ${quantity} more. Only ${product.stock} units available for ${product.name}`,
              cart,
            };
          }
          cart[existingItemIndex].quantity = newQuantity;
        } else {
          // Add new item
          cart.push({
            productId: product.id,
            name: product.name,
            quantity,
            price: product.price,
          });
        }
        
        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Update working memory - this will be persisted by Mastra
        runtimeAny.workingMemory = { ...workingMemory, cart };
        try {
          console.log('[cartTool] after add', {
            productId,
            quantity,
            cartLength: cart.length,
            cartTotal,
          });
        } catch {}
        
        return {
          success: true,
          message: `Added ${quantity}x ${product.name} to cart`,
          cart,
          cartTotal,
        };
      }
      
      case 'remove': {
        if (!productId) {
          return {
            success: false,
            message: 'Product ID is required for remove action',
            cart,
          };
        }
        
        const itemIndex = cart.findIndex(item => item.productId === productId);
        if (itemIndex === -1) {
          return {
            success: false,
            message: 'Item not found in cart',
            cart,
          };
        }
        
        const removedItem = cart[itemIndex];
        cart.splice(itemIndex, 1);
        
        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Update working memory - this will be persisted by Mastra
        runtimeAny.workingMemory = { ...workingMemory, cart };
        try {
          console.log('[cartTool] after remove', {
            productId,
            cartLength: cart.length,
            cartTotal,
          });
        } catch {}
        
        return {
          success: true,
          message: `Removed ${removedItem.name} from cart`,
          cart,
          cartTotal,
        };
      }
      
      case 'update': {
        if (!productId) {
          return {
            success: false,
            message: 'Product ID is required for update action',
            cart,
          };
        }
        
        const itemIndex = cart.findIndex(item => item.productId === productId);
        if (itemIndex === -1) {
          return {
            success: false,
            message: 'Item not found in cart',
            cart,
          };
        }
        
        // Find product in catalog to check stock
        const product = products.find(p => p.id === productId);
        if (!product) {
          return {
            success: false,
            message: `Product with ID "${productId}" not found`,
            cart,
          };
        }
        
        if (quantity > product.stock) {
          return {
            success: false,
            message: `Only ${product.stock} units available for ${product.name}`,
            cart,
          };
        }
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          cart.splice(itemIndex, 1);
        } else {
          cart[itemIndex].quantity = quantity;
        }
        
        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Update working memory - this will be persisted by Mastra
        runtimeAny.workingMemory = { ...workingMemory, cart };
        try {
          console.log('[cartTool] after update', {
            productId,
            quantity,
            cartLength: cart.length,
            cartTotal,
          });
        } catch {}
        
        return {
          success: true,
          message: `Updated ${product.name} quantity to ${quantity}`,
          cart,
          cartTotal,
        };
      }
      
      case 'view': {
        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        try {
          console.log('[cartTool] view', { cartLength: cart.length, cartTotal });
        } catch {}
        
        return {
          success: true,
          message: cart.length > 0 
            ? `Your cart contains ${cart.length} item(s)` 
            : 'Your cart is empty',
          cart,
          cartTotal,
        };
      }
      
      case 'clear': {
        cart = [];
        
        // Update working memory - this will be persisted by Mastra
        runtimeAny.workingMemory = { ...workingMemory, cart };
        try {
          console.log('[cartTool] after clear');
        } catch {}
        
        return {
          success: true,
          message: 'Cart cleared successfully',
          cart,
          cartTotal: 0,
        };
      }
      
      default:
        return {
          success: false,
          message: 'Invalid action',
          cart,
        };
    }
  },
});

