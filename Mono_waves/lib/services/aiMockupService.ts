import type { ProductVariant } from '@/types'

/**
 * Service for generating product mockups using AI via Xroute API (Seedream 5.0 Lite)
 * Requirement: .kiro/specs/admin-dashboard-real-data/doc.md
 */

interface XrouteMockupRequest {
    model: string;
    prompt: string;
    n: number;
    size: string;
}

interface XrouteMockupResponse {
    data: { url: string }[];
    error?: string;
}

export const aiMockupService = {
    /**
     * Extracts a clean product type (e.g., "Hoodie", "T-Shirt") from a potentially long Gelato title
     */
    extractProductType(rawTitle: string): string {
        const title = rawTitle.toLowerCase();
        if (title.includes('hoodie')) return 'premium hoodie';
        if (title.includes('crewneck') || title.includes('sweatshirt')) return 'crewneck sweatshirt';
        if (title.includes('t-shirt') || title.includes('tee')) return 'organic cotton t-shirt';
        if (title.includes('tank')) return 'tank top';
        if (title.includes('hat') || title.includes('cap')) return 'baseball cap';
        if (title.includes('bag') || title.includes('tote')) return 'canvas tote bag';
        if (title.includes('mug')) return 'ceramic mug';

        // Fallback to a cleaner version of the title if no keywords found
        return rawTitle.split(' ').slice(0, 3).join(' ');
    },

    /**
     * Generates AI mockups for a product
     * @param productType The type/name of product (e.g., "My Cool Hoodie Design")
     * @param color The color of the product
     * @param designUrl The URL of the design file to overlay (used in prompt context)
     * @param count Number of mockups to generate
     */
    async generateMockups(
        productType: string,
        color: string,
        designUrl: string,
        count: number = 2
    ): Promise<string[]> {
        const apiKey = process.env.XROUTE_API_KEY;
        const endpoint = process.env.XROUTE_ENDPOINT || 'https://api.xroute.ai/byteplus/v1/images/generations';

        if (!apiKey) {
            console.warn('XROUTE_API_KEY not found in environment variables. Falling back to placeholders.');
            return this.getPlaceholderMockups(productType, color);
        }

        // Use the full product name/type directly in the prompt
        // Extract garment type for better context
        const cleanedType = this.extractProductType(productType);

        // Build dynamic prompt that includes the product name
        const prompt = `Hyper-realistic ecommerce studio mockup of a ${color} ${cleanedType} called "${productType}". The product is being worn by a fashion model in a minimalist urban setting. Studio softbox lighting, clean neutral off-white background. Professional clothing photography, 8k resolution, highly detailed fabric texture. The mockup should look like a real product from a high-end streetwear brand.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for AI generation

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: process.env.XROUTE_MODEL || 'seedream-3-0-t2i-250415',
                    prompt: prompt,
                    n: count,
                    size: '1024x1024'
                } as XrouteMockupRequest),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Xroute API error: ${errorData.error || response.statusText}`);
            }

            const data: XrouteMockupResponse = await response.json();
            return data.data?.map(item => item.url) || [];

        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error('Failed to generate mockups: Request timed out after 60s');
            } else {
                console.error('Failed to generate mockups:', error);
            }
            // Fallback to placeholders for testing if API fails
            return this.getPlaceholderMockups(productType, color);
        }
    },

    /**
     * Helper to get placeholder mockups when AI generation fails or is disabled
     */
    getPlaceholderMockups(productType: string, color: string): string[] {
        const cleaned = this.extractProductType(productType);
        const svg = (label: string) => `data:image/svg+xml;base64,${Buffer.from(`
            <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
                <rect width="1024" height="1024" fill="#f3f4f6"/>
                <text x="50%" y="45%" font-family="Arial" font-size="40" fill="#9ca3af" text-anchor="middle" font-weight="bold">MONO VERSE MOCKUP</text>
                <text x="50%" y="55%" font-family="Arial" font-size="32" fill="#6b7280" text-anchor="middle">${color.toUpperCase()} ${cleaned.toUpperCase()} (${label})</text>
                <rect x="262" y="262" width="500" height="500" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="10,10"/>
                <text x="50%" y="90%" font-family="Arial" font-size="24" fill="#9ca3af" text-anchor="middle">AI GENERATION PENDING / OFFLINE MODE</text>
            </svg>
        `).toString('base64')}`;

        return [svg('FRONT'), svg('BACK')];
    }
}
