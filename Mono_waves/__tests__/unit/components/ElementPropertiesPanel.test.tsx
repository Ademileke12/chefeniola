/**
 * Unit Tests for ElementPropertiesPanel Component
 * Feature: design-editor-system
 * 
 * These tests validate specific edge cases and boundary conditions
 * for text styling controls.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import ElementPropertiesPanel from '@/components/admin/ElementPropertiesPanel'

describe('ElementPropertiesPanel', () => {
  const mockOnPropertyChange = jest.fn()
  const mockOnLayerChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should display message when no element is selected', () => {
      render(
        <ElementPropertiesPanel
          selectedElement={null}
          onPropertyChange={mockOnPropertyChange}
          onLayerChange={mockOnLayerChange}
        />
      )

      expect(screen.getByText('Select an element to edit its properties')).toBeInTheDocument()
    })
  })

  describe('Text Element Properties', () => {
    const mockTextElement = {
      type: 'i-text',
      fontSize: 24,
      fill: '#000000',
      textAlign: 'left',
      charSpacing: 0,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontFamily: 'Arial',
    }

    it('should render all text property controls', () => {
      render(
        <ElementPropertiesPanel
          selectedElement={mockTextElement}
          onPropertyChange={mockOnPropertyChange}
          onLayerChange={mockOnLayerChange}
        />
      )

      expect(screen.getByText('Text Properties')).toBeInTheDocument()
      expect(screen.getByText('Font Size (8-200pt)')).toBeInTheDocument()
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByText('Alignment')).toBeInTheDocument()
      expect(screen.getByText('Letter Spacing (-50 to 200)')).toBeInTheDocument()
      expect(screen.getByText('Line Height (0.5 to 3.0)')).toBeInTheDocument()
      expect(screen.getByText('Font Weight')).toBeInTheDocument()
      expect(screen.getByText('Font Style')).toBeInTheDocument()
    })

    /**
     * Test font size boundaries (8pt, 200pt)
     * Validates: Requirements 3.4
     */
    describe('Font Size Boundaries', () => {
      it('should clamp font size to minimum 8pt', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const fontSizeInput = screen.getByDisplayValue('24')
        fireEvent.change(fontSizeInput, { target: { value: '5' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontSize', 8)
      })

      it('should clamp font size to maximum 200pt', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const fontSizeInput = screen.getByDisplayValue('24')
        fireEvent.change(fontSizeInput, { target: { value: '250' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontSize', 200)
      })

      it('should accept valid font size within range', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const fontSizeInput = screen.getByDisplayValue('24')
        fireEvent.change(fontSizeInput, { target: { value: '48' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontSize', 48)
      })

      it('should handle edge case at minimum boundary (8pt)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const fontSizeInput = screen.getByDisplayValue('24')
        fireEvent.change(fontSizeInput, { target: { value: '8' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontSize', 8)
      })

      it('should handle edge case at maximum boundary (200pt)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const fontSizeInput = screen.getByDisplayValue('24')
        fireEvent.change(fontSizeInput, { target: { value: '200' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontSize', 200)
      })
    })

    /**
     * Test letter spacing boundaries (-50, 200)
     * Validates: Requirements 3.8
     */
    describe('Letter Spacing Boundaries', () => {
      it('should clamp letter spacing to minimum -50', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const letterSpacingInput = screen.getByDisplayValue('0')
        fireEvent.change(letterSpacingInput, { target: { value: '-100' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('charSpacing', -50)
      })

      it('should clamp letter spacing to maximum 200', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const letterSpacingInput = screen.getByDisplayValue('0')
        fireEvent.change(letterSpacingInput, { target: { value: '300' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('charSpacing', 200)
      })

      it('should accept valid letter spacing within range', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const letterSpacingInput = screen.getByDisplayValue('0')
        fireEvent.change(letterSpacingInput, { target: { value: '50' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('charSpacing', 50)
      })

      it('should handle edge case at minimum boundary (-50)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const letterSpacingInput = screen.getByDisplayValue('0')
        fireEvent.change(letterSpacingInput, { target: { value: '-50' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('charSpacing', -50)
      })

      it('should handle edge case at maximum boundary (200)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const letterSpacingInput = screen.getByDisplayValue('0')
        fireEvent.change(letterSpacingInput, { target: { value: '200' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('charSpacing', 200)
      })
    })

    /**
     * Test line height boundaries (0.5, 3.0)
     * Validates: Requirements 3.9
     */
    describe('Line Height Boundaries', () => {
      it('should clamp line height to minimum 0.5', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '0.2' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 0.5)
      })

      it('should clamp line height to maximum 3.0', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '5.0' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 3.0)
      })

      it('should accept valid line height within range', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '1.5' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 1.5)
      })

      it('should handle edge case at minimum boundary (0.5)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '0.5' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 0.5)
      })

      it('should handle edge case at maximum boundary (3.0)', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '3.0' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 3.0)
      })

      it('should handle NaN input by defaulting to 1.2', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const lineHeightInput = screen.getByDisplayValue('1.2')
        fireEvent.change(lineHeightInput, { target: { value: '' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('lineHeight', 1.2)
      })
    })

    /**
     * Test text alignment options
     * Validates: Requirements 3.7
     */
    describe('Text Alignment', () => {
      it('should handle left alignment', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const leftButton = screen.getByRole('button', { name: 'L' })
        fireEvent.click(leftButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('textAlign', 'left')
      })

      it('should handle center alignment', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const centerButton = screen.getByRole('button', { name: 'C' })
        fireEvent.click(centerButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('textAlign', 'center')
      })

      it('should handle right alignment', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const rightButton = screen.getByRole('button', { name: 'R' })
        fireEvent.click(rightButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('textAlign', 'right')
      })

      it('should handle justify alignment', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const justifyButton = screen.getByRole('button', { name: 'J' })
        fireEvent.click(justifyButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('textAlign', 'justify')
      })
    })

    /**
     * Test color input
     * Validates: Requirements 3.5
     */
    describe('Color Input', () => {
      it('should handle color picker change', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const colorPicker = screen.getAllByDisplayValue('#000000')[0]
        fireEvent.change(colorPicker, { target: { value: '#ff0000' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fill', '#ff0000')
      })

      it('should handle hex color text input', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const colorInput = screen.getAllByDisplayValue('#000000')[1]
        fireEvent.change(colorInput, { target: { value: '#00ff00' } })

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fill', '#00ff00')
      })
    })

    /**
     * Test font weight and style
     * Validates: Requirements 3.3
     */
    describe('Font Weight and Style', () => {
      it('should handle normal font weight', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const normalButtons = screen.getAllByRole('button', { name: 'Normal' })
        // First Normal button is for font weight
        fireEvent.click(normalButtons[0])

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontWeight', 'normal')
      })

      it('should handle bold font weight', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const boldButton = screen.getByRole('button', { name: 'Bold' })
        fireEvent.click(boldButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontWeight', 'bold')
      })

      it('should handle italic font style', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const italicButton = screen.getByRole('button', { name: 'Italic' })
        fireEvent.click(italicButton)

        expect(mockOnPropertyChange).toHaveBeenCalledWith('fontStyle', 'italic')
      })
    })

    /**
     * Test layer controls
     * Validates: Requirements 5.3, 5.4
     */
    describe('Layer Controls', () => {
      it('should render layer controls when onLayerChange is provided', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        expect(screen.getByText('Layer Order')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Forward' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Backward' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'To Front' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'To Back' })).toBeInTheDocument()
      })

      it('should call onLayerChange with forward direction', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const forwardButton = screen.getByRole('button', { name: 'Forward' })
        fireEvent.click(forwardButton)

        expect(mockOnLayerChange).toHaveBeenCalledWith('forward')
      })

      it('should call onLayerChange with backward direction', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const backwardButton = screen.getByRole('button', { name: 'Backward' })
        fireEvent.click(backwardButton)

        expect(mockOnLayerChange).toHaveBeenCalledWith('backward')
      })

      it('should call onLayerChange with front direction', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const frontButton = screen.getByRole('button', { name: 'To Front' })
        fireEvent.click(frontButton)

        expect(mockOnLayerChange).toHaveBeenCalledWith('front')
      })

      it('should call onLayerChange with back direction', () => {
        render(
          <ElementPropertiesPanel
            selectedElement={mockTextElement}
            onPropertyChange={mockOnPropertyChange}
            onLayerChange={mockOnLayerChange}
          />
        )

        const backButton = screen.getByRole('button', { name: 'To Back' })
        fireEvent.click(backButton)

        expect(mockOnLayerChange).toHaveBeenCalledWith('back')
      })
    })
  })

  describe('Non-Text Element', () => {
    it('should display image properties panel for image elements', () => {
      const mockImageElement = {
        type: 'image',
        url: 'https://example.com/image.png',
        opacity: 0.8,
        width: 200,
        height: 150,
        scaleX: 1.0,
        scaleY: 1.0,
        angle: 0,
      }

      render(
        <ElementPropertiesPanel
          selectedElement={mockImageElement}
          onPropertyChange={mockOnPropertyChange}
          onLayerChange={mockOnLayerChange}
        />
      )

      // Verify image properties panel is displayed
      expect(screen.getByText('Image Properties')).toBeInTheDocument()
      expect(screen.getByText('Opacity (0-100%)')).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument() // 0.8 * 100 = 80%
      expect(screen.getByText('Dimensions')).toBeInTheDocument()
      expect(screen.getByText('200 × 150 px')).toBeInTheDocument()
      expect(screen.getByText('Rotation')).toBeInTheDocument()
      expect(screen.getByText('0°')).toBeInTheDocument()
    })
  })
})
