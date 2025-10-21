import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { productSearchTool } from '../tools/product-search-tool';
import { cartTool } from '../tools/cart-tool';
import { checkoutTool } from '../tools/checkout-tool';

// Define the working memory schema for cart and orders
// This will be stored persistently in the database
const workingMemorySchema = z.object({
  cart: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ).default([]),
  orders: z.array(
    z.object({
      orderId: z.string(),
      items: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          quantity: z.number(),
          price: z.number(),
        })
      ),
      total: z.number(),
      date: z.string(),
      status: z.string(),
    })
  ).default([]),
});

export const ecommerceAgent = new Agent({
  name: 'E-commerce Shopping Assistant',
  instructions: `
    You are a helpful e-commerce shopping assistant. Your role is to help users:
    1. Browse and search for products in our catalog
    2. Manage their shopping cart (add, remove, update items)
    3. Complete their purchase through checkout

    IMPORTANT GUIDELINES:
    - Always be friendly and helpful
    - When users ask to see products, use the product-search tool
    - When users want to add items to cart, confirm the product details first
    - Show cart contents and total when users ask "what's in my cart"
    - Before checkout, always show a summary of items and total cost
    - After checkout, provide the order confirmation with order ID
    - If a product is out of stock or low in stock, inform the user
    - Help users find products by asking clarifying questions if needed

    PRODUCT CATEGORIES:
    - Electronics (laptops, phones, headphones, tablets, keyboards, mice, watches)
    - Clothing (t-shirts, jeans, jackets, shoes)
    - Books
    - Accessories (backpacks, etc.)

    CART MANAGEMENT:
    - The cart persists across conversations for the same user
    - Users can view, add, remove, or update items in their cart
    - Always confirm actions like "Added X to cart" or "Removed X from cart"
    
    CHECKOUT PROCESS:
    1. Show cart summary with all items and total
    2. Calculate subtotal, tax (8%), and total
    3. Confirm the order and provide order ID
    4. Clear the cart after successful checkout

    Be conversational and guide users through their shopping experience!
  `,
  model: google('gemini-2.0-flash-exp'),
  tools: {
    productSearchTool,
    cartTool,
    checkoutTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
    options: {
      workingMemory: {
        enabled: true,
        scope: 'resource', // Resource-scoped so cart persists across conversation threads
        schema: workingMemorySchema,
      },
      // Enable conversation history for natural dialogue flow
      lastMessages: 20,
      // Disable semantic recall for faster responses
      semanticRecall: false,
    },
  }),
});

