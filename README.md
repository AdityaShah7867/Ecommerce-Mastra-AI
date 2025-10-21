# E-comm Agent

An AI-powered e-commerce shopping assistant built with Mastra. It helps users browse products, manage a cart, and checkout via structured tools, with persistent working memory for cart and orders.

## Features

- Product search and filtering by name, category, and price
- Cart management: add, remove, update, view, clear
- Checkout with tax calculation and order confirmation
- Persistent working memory for `cart` and `orders` using LibSQL
- Tracing and logs via Mastra logger

## Tech Stack

- TypeScript, Node.js (>= 20.9.0)
- Mastra core, memory, and LibSQL storage
- Google Gemini (configurable) via `@ai-sdk/google`

## Project Structure

```text
src/
  mastra/
    agents/
      ecommerce-agent.ts
      weather-agent.ts
    tools/
      product-search-tool.ts
      cart-tool.ts
      checkout-tool.ts
    data/
      products.json
    workflows/
      weather-workflow.ts
    index.ts (Mastra app entry)
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Environment

- Node.js 20.9+ required
- If using Google Gemini, ensure your environment has the correct credentials configured as required by `@ai-sdk/google`.

### 3) Run the app (Dev)

```bash
npm run dev
```

This runs the Mastra dev server and watches for file changes.

### 4) Build and Start

```bash
npm run build
npm start
```

## Memory & Persistence

- Global storage is configured in `src/mastra/index.ts` via `LibSQLStore`:
  - `url: "file:../mastra.db"` to persist state locally (recommended).
- The `ecommerceAgent` enables working memory with a JSON schema containing `cart` and `orders`, and uses scope `resource` so the memory persists across threads for the same resource.

## Key Files

- `src/mastra/agents/ecommerce-agent.ts`: Configures the e-commerce agent, tools, and working memory.
- `src/mastra/tools/product-search-tool.ts`: Product search logic with filters.
- `src/mastra/tools/cart-tool.ts`: Cart operations and working-memory updates.
- `src/mastra/tools/checkout-tool.ts`: Checkout processing; clears cart after order and appends to order history.
- `src/mastra/data/products.json`: Demo product catalog.

## Development Notes

- We use structured working memory and merge updates to avoid accidental overwrites.
- Logs are emitted from tools (e.g., `[cartTool]`, `[checkoutTool]`) to trace cart state.

## Scripts

- `npm run dev`: Mastra dev server with watch
- `npm run build`: Build the project
- `npm start`: Start the built app

## License

MIT
