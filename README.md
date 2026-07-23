# StealHaus Product Entry Tool

A private tool: paste a product link, it pulls the details using Claude, you review and save straight to your Supabase database.

## How this matches your database

This has been built against your actual Supabase structure:

- **Brand** is looked up in your `brands` table by name - if it doesn't exist yet, it's created automatically
- **Retailer** is looked up in your `retailers` table by name - it will **not** auto-create a retailer (your retailer list is curated on purpose), so the name you type must match exactly. If you get an error saying a retailer wasn't found, check spelling against your Retailers tab.
- The **product** itself is saved to `products`, linked to the brand and retailer by ID
- Each **size** you list is saved as its own row in `product_variants`, linked to that product
- Duplicate checking is done by matching the exact **Product URL** already saved in `products`

## Step 1 — Get a Claude API key

1. Go to console.anthropic.com and sign in (or create an account - separate from claude.ai)
2. Go to **Settings > API Keys**
3. Click **Create Key**, name it `stealhaus-tool`
4. Copy it somewhere safe - you won't be able to see it again after this

This is billed per use (pence, not pounds, for a job like this) - not the same as your claude.ai subscription.

## Step 2 — Push this code to GitHub

1. Create a free GitHub account if you don't have one (github.com)
2. Create a new repository called `stealhaus-entry-tool`
3. Upload all the files in this folder to that repository
 (Easiest way: on the repo page, click "Add file" > "Upload files", then drag the whole folder in)

## Step 3 — Deploy on Vercel

1. Go to vercel.com and sign up using your GitHub account
2. Click **Add New > Project**
3. Choose the `stealhaus-entry-tool` repository
4. Before clicking Deploy, click **Environment Variables** and add these three:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gcjepkiysndqgwvoydxz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_bIhhdVJal-1IvW4ZPopKJA_H-B2Iu5Q` |
| `ANTHROPIC_API_KEY` | *(the key you copied in Step 1)* |

5. Click **Deploy**
6. After a minute or two, Vercel gives you a live link (something like `stealhaus-entry-tool.vercel.app`) - that's your private tool

## Using it

1. Paste a product page link
2. Click **Get details**
3. Check every field it fills in - fix anything wrong
4. If it flags a possible duplicate, review it before choosing "Save anyway"
5. Click **Save to database**

## What this tool does NOT do

- Doesn't crawl or bulk-scrape a whole site - one link at a time, by hand
- Doesn't sync stock automatically - you update Stock Status when you re-check an item
- Doesn't handle checkout, payments, or live affiliate links
