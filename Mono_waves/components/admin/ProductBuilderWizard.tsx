'use client'

import React, { useState, useEffect } from 'react'
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Upload,
    Plus,
    Search,
    Image as ImageIcon,
    CheckCircle2,
    AlertCircle,
    X
} from 'lucide-react'
import { GelatoProduct, CreateProductData, ProductVariant } from '@/types/product'
import Image from 'next/image'
import { authenticatedFetch } from '@/lib/utils/apiClient'

interface ProductBuilderWizardProps {
    gelatoProducts: GelatoProduct[]
    onSubmit: (data: CreateProductData) => Promise<void>
    onCancel: () => void
}

type Step = 1 | 2 | 3 | 4

export default function ProductBuilderWizard({
    gelatoProducts,
    onSubmit,
    onCancel
}: ProductBuilderWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>(1)
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    // Wizards State
    const [selectedGelato, setSelectedGelato] = useState<GelatoProduct | null>(null)
    const [details, setDetails] = useState({
        name: '',
        description: '',
        price: 29.99,
        category: ''
    })
    const [designFile, setDesignFile] = useState<File | null>(null)
    const [designUrl, setDesignUrl] = useState<string>('')
    const [generatedImages, setGeneratedImages] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    // Variant Selection State
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])

    // Step 1: Base Product Selection
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    
    const CATEGORIES = [
        { id: 'all', label: 'All Categories' },
        { id: 'mens', label: "Men's Clothing" },
        { id: 'womens', label: "Women's Clothing" },
        { id: 'kids', label: "Kids & Baby" },
        { id: 'unisex', label: "Unisex" },
    ]
    
    const filteredProducts = gelatoProducts.filter(p => {
        // Filter by search query
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        
        // Filter by category
        let matchesCategory = true
        if (selectedCategory !== 'all') {
            const category = p.category?.toLowerCase() || ''
            if (selectedCategory === 'mens') {
                matchesCategory = category.includes("men's") || category.includes('men')
            } else if (selectedCategory === 'womens') {
                matchesCategory = category.includes("women's") || category.includes('women') || category.includes('ladies')
            } else if (selectedCategory === 'kids') {
                matchesCategory = category.includes('kids') || category.includes('baby')
            } else if (selectedCategory === 'unisex') {
                matchesCategory = category.includes('unisex')
            }
        }
        
        return matchesSearch && matchesCategory
    })

    const handleSelectGelato = (product: GelatoProduct) => {
        setSelectedGelato(product)
        setDetails(prev => ({
            ...prev,
            name: product.title,
            description: product.description
        }))
        setSelectedSizes(product.availableSizes)
        setSelectedColors(product.availableColors.map(c => c.name))
        setCurrentStep(2)
    }

    // Step 3: Design Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setDesignFile(file)
        setUploading(true)
        setUploadError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await authenticatedFetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || errorData.details || 'Upload failed')
            }
            
            const data = await response.json()
            setDesignUrl(data.url)
            setUploadError(null)
        } catch (err) {
            console.error('Upload error:', err)
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload design file'
            setUploadError(errorMessage)
            setDesignUrl('')
        } finally {
            setUploading(false)
        }
    }

    // Step 4: AI Mockup Generation
    const handleGenerateMockups = async () => {
        if (!selectedGelato || !designUrl) return

        setGenerating(true)
        try {
            // Use the custom product name from details, not the Gelato title
            const productName = details.name || selectedGelato.title
            
            const response = await fetch('/api/ai/generate-mockups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productType: productName, // Use the custom product name
                    color: selectedColors[0] || 'white',
                    designUrl: designUrl,
                    count: 2
                })
            })

            if (!response.ok) throw new Error('Generation failed')
            const data = await response.json()
            setGeneratedImages(data.images)
        } catch (err) {
            console.error('Generation error:', err)
            alert('Failed to generate AI mockups')
        } finally {
            setGenerating(false)
        }
    }

    const handleFinalSubmit = async () => {
        if (!selectedGelato || !designUrl) return

        setLoading(true)
        try {
            const variants: ProductVariant[] = selectedSizes.flatMap(size =>
                selectedGelato.availableColors
                    .filter(color => selectedColors.includes(color.name))
                    .map(color => {
                        const gelatoUid = selectedGelato.variants[`${size}:${color.name}`]
                        if (!gelatoUid) return null
                        return {
                            size,
                            color: color.name,
                            colorCode: color.code,
                            variantId: gelatoUid // CRITICAL: Actual Gelato UID for fulfillment
                        }
                    })
            ).filter(v => v !== null) as ProductVariant[]

            const productData: CreateProductData = {
                name: details.name,
                description: details.description,
                price: details.price,
                gelatoProductId: selectedGelato.uid,
                gelatoProductUid: selectedGelato.uid,
                variants: variants,
                designFileUrl: designUrl,
                images: generatedImages.length > 0 ? generatedImages : [designUrl],
            }

            await onSubmit(productData)
        } catch (err) {
            console.error('Submit error:', err)
        } finally {
            setLoading(false)
        }
    }

    const steps = [
        { id: 1, name: 'Base Product' },
        { id: 2, name: 'Details' },
        { id: 3, name: 'Design' },
        { id: 4, name: 'Mockups' }
    ]

    return (
        <div className="max-w-5xl mx-auto py-8">
            {/* Progress Bar */}
            <nav aria-label="Progress" className="mb-12">
                <ol className="flex items-center justify-between w-full">
                    {steps.map((step, idx) => (
                        <li key={step.name} className={`relative ${idx !== steps.length - 1 ? 'flex-1' : ''}`}>
                            <div className="flex items-center">
                                <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-200 ${currentStep >= step.id
                                    ? 'border-black bg-black text-white'
                                    : 'border-gray-300 bg-white text-gray-500'
                                    }`}>
                                    {currentStep > step.id ? <Check className="h-6 w-6" /> : step.id}
                                </span>
                                <span className={`ml-4 text-sm font-medium ${currentStep >= step.id ? 'text-black' : 'text-gray-500'
                                    }`}>
                                    {step.name}
                                </span>
                                {idx !== steps.length - 1 && (
                                    <div className="ml-8 hidden flex-1 border-t-2 border-gray-200 md:block" />
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </nav>

            {/* Step Content */}
            <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-4 sm:p-8 min-h-[500px]">

                {/* Step 1: Catalog */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Select Base Product</h2>
                            <p className="text-gray-500">Pick a high-quality item from Gelato&apos;s catalog.</p>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Results count */}
                        <div className="text-sm text-gray-500">
                            Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {filteredProducts.map(p => (
                                <div
                                    key={p.uid}
                                    onClick={() => handleSelectGelato(p)}
                                    className={`group cursor-pointer border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/5 ${selectedGelato?.uid === p.uid ? 'border-black ring-1 ring-black' : 'border-gray-100 hover:border-black'
                                        }`}
                                >
                                    <div className="aspect-square bg-[#F9F9F9] flex items-center justify-center p-4 sm:p-8 group-hover:bg-black/5 transition-colors">
                                        <ImageIcon className="h-10 w-10 text-gray-300 group-hover:text-black transition-all duration-500 scale-100 group-hover:scale-110" />
                                    </div>
                                    <div className="p-4 bg-white border-t border-gray-50">
                                        <h3 className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{p.title}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">From ${p.basePrice}</p>
                                        {p.category && (
                                            <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">{p.category}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No products found matching your criteria</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('')
                                        setSelectedCategory('all')
                                    }}
                                    className="mt-4 text-sm text-black hover:underline"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Details */}
                {currentStep === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
                            <p className="text-gray-500">How should this product appear on your store?</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                                        value={details.name}
                                        onChange={(e) => setDetails({ ...details, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg font-mono"
                                            value={details.price}
                                            onChange={(e) => setDetails({ ...details, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm"
                                    value={details.description}
                                    onChange={(e) => setDetails({ ...details, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Variant Selection */}
                        <div className="pt-8 border-t space-y-8">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Available Sizes</h3>
                                    <span className="text-xs text-gray-500">{selectedSizes.length} selected</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGelato?.availableSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSizes(prev =>
                                                prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                                            )}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedSizes.includes(size)
                                                ? 'border-black bg-black text-white shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-900'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Available Colors</h3>
                                    <span className="text-xs text-gray-500">{selectedColors.length} selected</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {selectedGelato?.availableColors.map(color => (
                                        <button
                                            key={color.name}
                                            onClick={() => setSelectedColors(prev =>
                                                prev.includes(color.name) ? prev.filter(c => c !== color.name) : [...prev, color.name]
                                            )}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedColors.includes(color.name)
                                                ? 'border-black bg-black text-white shadow-sm'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-900'
                                                }`}
                                        >
                                            <span
                                                className="h-3 w-3 rounded-full border border-black/10"
                                                style={{ backgroundColor: color.code }}
                                            />
                                            {color.name}
                                            {selectedColors.includes(color.name) && <Check className="h-3 w-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-8 border-t">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="flex items-center gap-2 text-gray-600 hover:text-black"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to Catalog
                            </button>
                            <button
                                onClick={() => setCurrentStep(3)}
                                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-black/90 flex items-center gap-2"
                            >
                                Continue to Design <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Design Upload */}
                {currentStep === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Upload Design</h2>
                            <p className="text-gray-500">Upload your artwork (PNG or SVG recommended).</p>
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                                uploadError 
                                    ? 'border-red-500 bg-red-50/30' 
                                    : designUrl 
                                    ? 'border-green-500 bg-green-50/30' 
                                    : 'border-gray-200 hover:border-black bg-gray-50'
                                }`}
                        >
                            <input
                                type="file"
                                id="design-upload"
                                className="hidden"
                                onChange={handleFileUpload}
                                accept="image/*"
                            />
                            <label htmlFor="design-upload" className="cursor-pointer flex flex-col items-center">
                                {uploading ? (
                                    <Loader2 className="h-12 w-12 text-black animate-spin mb-4" />
                                ) : uploadError ? (
                                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                                ) : designUrl ? (
                                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                ) : (
                                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                                )}
                                <span className={`text-lg font-semibold ${uploadError ? 'text-red-900' : 'text-gray-900'}`}>
                                    {uploading ? 'Uploading...' : uploadError ? 'Upload Failed' : designUrl ? 'Design Uploaded!' : 'Click to upload design'}
                                </span>
                                <p className="text-sm text-gray-500 mt-2">
                                    {uploadError ? 'Click to try again' : 'Maximum file size 10MB'}
                                </p>
                            </label>
                        </div>

                        {/* Error Message */}
                        {uploadError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-red-900 mb-1">Upload Error</h3>
                                    <p className="text-sm text-red-700">{uploadError}</p>
                                </div>
                                <button
                                    onClick={() => setUploadError(null)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {designUrl && !uploadError && (
                            <div className="flex items-center justify-center">
                                <div className="relative w-48 aspect-square border rounded-lg overflow-hidden bg-white shadow-sm">
                                    <Image src={designUrl} alt="Design preview" fill className="object-contain p-4" />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-8 border-t">
                            <button
                                onClick={() => setCurrentStep(2)}
                                className="flex items-center gap-2 text-gray-600 hover:text-black"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to Details
                            </button>
                            <button
                                disabled={!designUrl || uploading}
                                onClick={() => setCurrentStep(4)}
                                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-black/90 flex items-center gap-2 disabled:opacity-50"
                            >
                                Generate Mockups <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: AI Mockups */}
                {currentStep === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Product Mockups</h2>
                                <p className="text-gray-500">AI-generated realistic previews of your product.</p>
                            </div>
                            {!generating && generatedImages.length === 0 && (
                                <button
                                    onClick={handleGenerateMockups}
                                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-black/90 flex items-center gap-2"
                                >
                                    Generate Now
                                </button>
                            )}
                        </div>

                        {generating ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-12 w-12 text-black animate-spin" />
                                <p className="text-gray-900 font-medium">Seedream 5.0 Lite is generating your mockups...</p>
                                <p className="text-sm text-gray-500">This usually takes 10-20 seconds</p>
                            </div>
                        ) : generatedImages.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                                {generatedImages.map((src, i) => (
                                    <div key={i} className="relative aspect-square border rounded-2xl overflow-hidden group shadow-md">
                                        <Image src={src} alt={`Mockup ${i + 1}`} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => setGeneratedImages(generatedImages.filter((_, idx) => idx !== i))}
                                                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={handleGenerateMockups}
                                    className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center hover:border-black transition-colors bg-gray-50"
                                >
                                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-600">Regenerate</span>
                                </button>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-2xl py-20 bg-gray-50 text-center">
                                <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900">No mockups yet</h3>
                                <p className="text-gray-500 max-w-sm mx-auto mt-2">Click below to start the AI generation process using your design and product specs.</p>
                                <button
                                    onClick={handleGenerateMockups}
                                    className="mt-6 bg-black text-white px-8 py-3 rounded-xl hover:bg-black/90 font-semibold"
                                >
                                    Generate Mockups
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between pt-8 border-t">
                            <button
                                onClick={() => setCurrentStep(3)}
                                className="flex items-center gap-2 text-gray-600 hover:text-black"
                                disabled={loading}
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to Design
                            </button>
                            <button
                                disabled={loading || generating}
                                onClick={handleFinalSubmit}
                                className="bg-black text-white px-12 py-3 rounded-lg hover:bg-black/90 flex items-center gap-2 font-bold shadow-lg shadow-black/10"
                            >
                                {loading ? (
                                    <> <Loader2 className="h-5 w-5 animate-spin" /> Saving... </>
                                ) : (
                                    'Publish Product'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
