import { NextRequest, NextResponse } from 'next/server'
import { aiMockupService } from '@/lib/services/aiMockupService'

/**
 * POST /api/ai/generate-mockups
 * Generates AI mockups for a product
 */
export async function POST(request: NextRequest) {
    try {
        // TODO: Add admin authentication check

        const body = await request.json()
        const { productType, color, designUrl, count } = body

        if (!productType || !color || !designUrl) {
            return NextResponse.json(
                { error: 'Missing required fields: productType, color, and designUrl are required' },
                { status: 400 }
            )
        }

        const images = await aiMockupService.generateMockups(
            productType,
            color,
            designUrl,
            count || 2
        )

        return NextResponse.json({ images })
    } catch (error) {
        console.error('Error in AI mockup generation route:', error)
        return NextResponse.json(
            { error: 'Failed to generate mockups' },
            { status: 500 }
        )
    }
}
