/**
 * Design State Serializer Service
 * 
 * Handles serialization and deserialization of design states for persistence.
 * Requirements: 8.1, 8.3, 8.4
 */

import * as fabric from 'fabric'

export interface DesignState {
  version: string
  elements: DesignElement[]
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
}

export interface DesignElement {
  id: string
  type: 'text' | 'image'
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  zIndex: number
  properties: TextProperties | ImageProperties
}

export interface TextProperties {
  content: string
  fontFamily: string
  fontSize: number
  color: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
  letterSpacing: number
  lineHeight: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
}

export interface ImageProperties {
  url: string
  opacity: number
  filters?: string[]
}

/**
 * Serializes a Fabric.js canvas to a DesignState JSON structure
 * Requirement 8.1: Serialize complete design data to JSON format
 */
export function serializeDesignState(canvas: fabric.Canvas): DesignState {
  const objects = canvas.getObjects()
  
  const elements: DesignElement[] = objects.map((obj, index) => {
    const element: DesignElement = {
      id: (obj as any).id || `element-${Date.now()}-${index}`,
      type: obj.type === 'i-text' || obj.type === 'text' ? 'text' : 'image',
      position: {
        x: obj.left || 0,
        y: obj.top || 0
      },
      size: {
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1)
      },
      rotation: obj.angle || 0,
      zIndex: index, // Index in the objects array represents z-order
      properties: {} as any
    }

    // Serialize type-specific properties
    if (obj.type === 'i-text' || obj.type === 'text') {
      const textObj = obj as fabric.IText
      element.properties = {
        content: textObj.text || '',
        fontFamily: textObj.fontFamily || 'Arial',
        fontSize: textObj.fontSize || 24,
        color: textObj.fill as string || '#000000',
        textAlign: textObj.textAlign || 'left',
        letterSpacing: textObj.charSpacing || 0,
        lineHeight: textObj.lineHeight || 1.2,
        fontWeight: textObj.fontWeight as 'normal' | 'bold' || 'normal',
        fontStyle: textObj.fontStyle as 'normal' | 'italic' || 'normal'
      } as TextProperties
    } else if (obj.type === 'image') {
      const imageObj = obj as fabric.FabricImage
      element.properties = {
        url: (imageObj as any)._originalElement?.src || (imageObj as any).src || '',
        opacity: imageObj.opacity || 1.0,
        filters: []
      } as ImageProperties
    }

    return element
  })

  return {
    version: '1.0',
    canvasWidth: canvas.width || 0,
    canvasHeight: canvas.height || 0,
    backgroundColor: canvas.backgroundColor as string || '#ffffff',
    elements
  }
}

/**
 * Deserializes a DesignState JSON structure back to Fabric.js canvas objects
 * Requirements 8.3, 8.4: Restore all design elements with all properties preserved
 */
export async function deserializeDesignState(
  canvas: fabric.Canvas,
  state: DesignState
): Promise<void> {
  // Clear existing objects
  canvas.clear()
  
  // Set canvas properties
  canvas.width = state.canvasWidth
  canvas.height = state.canvasHeight
  canvas.backgroundColor = state.backgroundColor
  canvas.renderAll()

  // Sort elements by zIndex to maintain layer order
  const sortedElements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex)

  // Recreate each element
  for (const element of sortedElements) {
    try {
      if (element.type === 'text') {
        const textProps = element.properties as TextProperties
        
        const textObj = new fabric.IText(textProps.content, {
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          fontFamily: textProps.fontFamily,
          fontSize: textProps.fontSize,
          fill: textProps.color,
          textAlign: textProps.textAlign,
          charSpacing: textProps.letterSpacing,
          lineHeight: textProps.lineHeight,
          fontWeight: textProps.fontWeight,
          fontStyle: textProps.fontStyle,
          angle: element.rotation,
        })

        // Store the element ID
        ;(textObj as any).id = element.id

        canvas.add(textObj)
      } else if (element.type === 'image') {
        const imageProps = element.properties as ImageProperties
        
        // Load image from URL
        const imageObj = await fabric.FabricImage.fromURL(imageProps.url, {
          crossOrigin: 'anonymous'
        })

        // Calculate scale to match the stored size
        const scaleX = element.size.width / (imageObj.width || 1)
        const scaleY = element.size.height / (imageObj.height || 1)

        imageObj.set({
          left: element.position.x,
          top: element.position.y,
          scaleX,
          scaleY,
          angle: element.rotation,
          opacity: imageProps.opacity,
          lockScalingFlip: true,
        })

        // Store the element ID and original aspect ratio
        const originalAspectRatio = (imageObj.width || 1) / (imageObj.height || 1)
        ;(imageObj as any).id = element.id
        ;(imageObj as any).data = { 
          originalAspectRatio,
          url: imageProps.url
        }

        // Add event listener to maintain aspect ratio during scaling
        imageObj.on('scaling', function(this: fabric.FabricImage) {
          const aspectRatio = (this as any).data?.originalAspectRatio || 1
          
          if (this.scaleX && this.scaleY) {
            const avgScale = (this.scaleX + this.scaleY) / 2
            this.scaleX = avgScale
            this.scaleY = avgScale
          }
        })

        canvas.add(imageObj)
      }
    } catch (error) {
      console.error(`Failed to deserialize element ${element.id}:`, error)
      // Continue with other elements even if one fails
    }
  }

  canvas.renderAll()
}

/**
 * Validates a DesignState JSON structure
 * Returns true if valid, false otherwise
 */
export function validateDesignState(state: any): state is DesignState {
  if (!state || typeof state !== 'object') {
    return false
  }

  // Check required fields
  if (typeof state.version !== 'string') {
    return false
  }

  if (!Array.isArray(state.elements)) {
    return false
  }

  if (typeof state.canvasWidth !== 'number' || typeof state.canvasHeight !== 'number') {
    return false
  }

  // Check for NaN in canvas dimensions
  if (Number.isNaN(state.canvasWidth) || Number.isNaN(state.canvasHeight)) {
    return false
  }

  if (typeof state.backgroundColor !== 'string') {
    return false
  }

  // Validate each element
  for (const element of state.elements) {
    if (!element || typeof element !== 'object') {
      return false
    }

    if (typeof element.id !== 'string') {
      return false
    }

    if (element.type !== 'text' && element.type !== 'image') {
      return false
    }

    if (!element.position || typeof element.position.x !== 'number' || typeof element.position.y !== 'number') {
      return false
    }

    // Check for NaN in position
    if (Number.isNaN(element.position.x) || Number.isNaN(element.position.y)) {
      return false
    }

    if (!element.size || typeof element.size.width !== 'number' || typeof element.size.height !== 'number') {
      return false
    }

    // Check for NaN in size
    if (Number.isNaN(element.size.width) || Number.isNaN(element.size.height)) {
      return false
    }

    if (typeof element.rotation !== 'number') {
      return false
    }

    // Check for NaN in rotation
    if (Number.isNaN(element.rotation)) {
      return false
    }

    if (typeof element.zIndex !== 'number') {
      return false
    }

    // Check for NaN in zIndex
    if (Number.isNaN(element.zIndex)) {
      return false
    }

    if (!element.properties || typeof element.properties !== 'object') {
      return false
    }

    // Validate type-specific properties
    if (element.type === 'text') {
      const props = element.properties as TextProperties
      if (typeof props.content !== 'string' ||
          typeof props.fontFamily !== 'string' ||
          typeof props.fontSize !== 'number' ||
          typeof props.color !== 'string' ||
          !['left', 'center', 'right', 'justify'].includes(props.textAlign) ||
          typeof props.letterSpacing !== 'number' ||
          typeof props.lineHeight !== 'number' ||
          !['normal', 'bold'].includes(props.fontWeight) ||
          !['normal', 'italic'].includes(props.fontStyle)) {
        return false
      }
      
      // Check for NaN in numeric text properties
      if (Number.isNaN(props.fontSize) || 
          Number.isNaN(props.letterSpacing) || 
          Number.isNaN(props.lineHeight)) {
        return false
      }
    } else if (element.type === 'image') {
      const props = element.properties as ImageProperties
      if (typeof props.url !== 'string' ||
          typeof props.opacity !== 'number') {
        return false
      }
      
      // Check for NaN in opacity
      if (Number.isNaN(props.opacity)) {
        return false
      }
    }
  }

  return true
}

/**
 * Serializes a DesignState to a JSON string
 * Requirement 8.1: Serialize to JSON format
 */
export function serializeToJSON(state: DesignState): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Deserializes a JSON string to a DesignState
 * Handles errors gracefully and returns null if invalid
 * Requirement 8.3: Deserialize design state
 */
export function deserializeFromJSON(json: string): DesignState | null {
  try {
    const parsed = JSON.parse(json)
    
    if (!validateDesignState(parsed)) {
      console.error('Invalid design state structure')
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to parse design state JSON:', error)
    return null
  }
}
