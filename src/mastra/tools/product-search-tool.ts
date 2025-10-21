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

// Load products from JSON file
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

export const productSearchTool = createTool({
  id: 'product-search',
  description: `Search and filter products in the store. Can search by name, category, or price range. 
  Use this tool when users ask to see products, browse items, or search for specific products.`,
  inputSchema: z.object({
    query: z.string().optional().describe('Search query to match product name or description'),
    category: z.string().optional().describe('Filter by category (electronics, clothing, books, accessories)'),
    minPrice: z.number().optional().describe('Minimum price filter'),
    maxPrice: z.number().optional().describe('Maximum price filter'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return'),
  }),
  outputSchema: z.object({
    products: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        category: z.string(),
        stock: z.number(),
        imageUrl: z.string(),
      })
    ),
    totalFound: z.number(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { query, category, minPrice, maxPrice, limit = 10 } = context;
    
    let products = loadProducts();
    
    // Filter by category
    if (category) {
      products = products.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by search query (name or description)
    if (query) {
      const searchTerm = query.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by price range
    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }
    
    // Filter out products with no stock
    products = products.filter(p => p.stock > 0);
    
    const totalFound = products.length;
    
    // Limit results
    products = products.slice(0, limit);
    
    let message = `Found ${totalFound} product(s)`;
    if (totalFound > limit) {
      message += ` (showing first ${limit})`;
    }
    
    return {
      products,
      totalFound,
      message,
    };
  },
});

