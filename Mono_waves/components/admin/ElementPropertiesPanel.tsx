'use client'

import { TextProperties } from './DesignEditorCanvas'

interface ElementPropertiesPanelProps {
  selectedElement: any | null
  onPropertyChange: (property: string, value: any) => void
  onLayerChange?: (direction: 'forward' | 'backward' | 'front' | 'back') => void
}

export default function ElementPropertiesPanel({
  selectedElement,
  onPropertyChange,
  onLayerChange
}: ElementPropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <p className="text-sm text-gray-500">
          Select an element to edit its properties
        </p>
      </div>
    )
  }

  // Check if it's a text element
  const isTextElement = selectedElement.type === 'i-text' || selectedElement.type === 'text'
  const isImageElement = selectedElement.type === 'image'

  // Render image properties panel
  if (isImageElement) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Image Properties</h3>
        
        {/* Opacity */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Opacity (0-100%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((selectedElement.opacity || 1) * 100)}
            onChange={(e) => {
              const value = parseInt(e.target.value) / 100
              onPropertyChange('opacity', value)
            }}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {Math.round((selectedElement.opacity || 1) * 100)}%
          </div>
        </div>

        {/* Dimensions (read-only display) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Dimensions
          </label>
          <div className="text-sm text-gray-600">
            {Math.round(selectedElement.width * (selectedElement.scaleX || 1))} × {Math.round(selectedElement.height * (selectedElement.scaleY || 1))} px
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Images are automatically sized to fit canvas
          </div>
        </div>

        {/* Position (read-only display) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Position
          </label>
          <div className="text-sm text-gray-600">
            X: {Math.round(selectedElement.left || 0)}, Y: {Math.round(selectedElement.top || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Images are automatically centered on canvas
          </div>
        </div>

        {/* Rotation (disabled for images) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Rotation
          </label>
          <div className="text-sm text-gray-600">
            Locked (0°)
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Image rotation is disabled to prevent glitches
          </div>
        </div>

        {/* Layer Controls */}
        {onLayerChange && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-900 mb-2">Layer Order</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onLayerChange('forward')}
                className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Forward
              </button>
              <button
                type="button"
                onClick={() => onLayerChange('backward')}
                className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Backward
              </button>
              <button
                type="button"
                onClick={() => onLayerChange('front')}
                className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                To Front
              </button>
              <button
                type="button"
                onClick={() => onLayerChange('back')}
                className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                To Back
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isTextElement) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <p className="text-sm text-gray-500">
          Select an element to edit its properties
        </p>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Text Properties</h3>
      
      {/* Font Size */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Size (8-200pt)
        </label>
        <input
          type="number"
          min="8"
          max="200"
          value={Math.round(selectedElement.fontSize || 24)}
          onChange={(e) => {
            const value = Math.max(8, Math.min(200, parseInt(e.target.value) || 24))
            onPropertyChange('fontSize', value)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Color */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedElement.fill || '#000000'}
            onChange={(e) => onPropertyChange('fill', e.target.value)}
            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={selectedElement.fill || '#000000'}
            onChange={(e) => onPropertyChange('fill', e.target.value)}
            placeholder="#000000"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Text Alignment */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Alignment
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onPropertyChange('textAlign', align)}
              className={`px-2 py-2 text-xs border rounded transition-colors ${
                selectedElement.textAlign === align
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {align.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Letter Spacing (-50 to 200)
        </label>
        <input
          type="number"
          min="-50"
          max="200"
          value={Math.round(selectedElement.charSpacing || 0)}
          onChange={(e) => {
            const value = Math.max(-50, Math.min(200, parseInt(e.target.value) || 0))
            onPropertyChange('charSpacing', value)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Line Height */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Line Height (0.5 to 3.0)
        </label>
        <input
          type="number"
          min="0.5"
          max="3.0"
          step="0.1"
          value={selectedElement.lineHeight || 1.2}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value)
            const value = Number.isNaN(parsed) ? 1.2 : Math.max(0.5, Math.min(3.0, parsed))
            onPropertyChange('lineHeight', value)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Font Weight */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Weight
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPropertyChange('fontWeight', 'normal')}
            className={`px-3 py-2 text-sm border rounded transition-colors ${
              selectedElement.fontWeight === 'normal'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onPropertyChange('fontWeight', 'bold')}
            className={`px-3 py-2 text-sm border rounded transition-colors ${
              selectedElement.fontWeight === 'bold'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Bold
          </button>
        </div>
      </div>

      {/* Font Style */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPropertyChange('fontStyle', 'normal')}
            className={`px-3 py-2 text-sm border rounded transition-colors ${
              selectedElement.fontStyle === 'normal'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onPropertyChange('fontStyle', 'italic')}
            className={`px-3 py-2 text-sm border rounded transition-colors ${
              selectedElement.fontStyle === 'italic'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Italic
          </button>
        </div>
      </div>

      {/* Layer Controls */}
      {onLayerChange && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">Layer Order</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onLayerChange('forward')}
              className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Forward
            </button>
            <button
              type="button"
              onClick={() => onLayerChange('backward')}
              className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Backward
            </button>
            <button
              type="button"
              onClick={() => onLayerChange('front')}
              className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              To Front
            </button>
            <button
              type="button"
              onClick={() => onLayerChange('back')}
              className="px-3 py-2 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              To Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
