# Design Document: Design Editor & Product Creation System

## Overview

The Design Editor & Product Creation System extends the Mono Waves e-commerce platform with a visual design editor that enables administrators to create custom product designs without external design software. The system integrates seamlessly with the existing ProductForm component and Gelato API integration, providing a complete workflow from design creation to print-ready file generation.

The design editor uses Fabric.js as the canvas library, chosen for its object-oriented approach, built-in text and image manipulation, and strong support for design editor use cases. The system maintains backward compatibility with the existing file upload workflow while adding powerful design capabilities.

### Key Design Decisions

1. **Canvas Library**: Fabric.js selected over Konva.js for its superior text handling, SVG support, and design-oriented features
2. **Integration Strategy**: Extend ProductForm rather than replace it, maintaining existing functionality
3. **State Management**: Use React state for UI and Fabric.js canvas state for design elements
4. **Export Strategy**: Scale canvas to print dimensions (300 DPI equivalent) before export
5. **Font Loading**: Dynamic loading via Google Fonts API with caching
6. **Persistence**: Store both serialized design state (JSON) and exported image URL



## Architecture

The system follows a component-based architecture that integrates with the existing admin panel structure:

```
┌─────────────────────────────────────────────────────────────┐
│                      ProductForm                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Design Creation Mode Selector                  │  │
│  │  [ Design Editor ]  [ Upload File ]                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              DesignEditorCanvas                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Fabric.js Canvas                         │  │  │
│  │  │  - Text Elements                                 │  │  │
│  │  │  - Image Elements                                │  │  │
│  │  │  - Layering & Positioning                        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         DesignToolbar                            │  │  │
│  │  │  [Add Text] [Add Image] [Undo] [Redo]          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         ElementPropertiesPanel                   │  │  │
│  │  │  - Font Selection                                │  │  │
│  │  │  - Size, Color, Alignment                        │  │  │
│  │  │  - Layer Controls                                │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MockupPreview (Enhanced)                  │  │
│  │  - Real-time design overlay                           │  │
│  │  - Front/Back views                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Design Creation**: User interacts with DesignEditorCanvas → Fabric.js updates canvas → React state syncs
2. **Design Export**: Canvas serialized to JSON → Scaled canvas exported to PNG → Uploaded to Supabase Storage
3. **Design Persistence**: Design state JSON stored in database → Restored when editing existing product
4. **Mockup Generation**: Design state → Rendered on mockup template → Displayed in MockupPreview



## Components and Interfaces

### DesignEditorCanvas Component

The main canvas component that wraps Fabric.js and provides the design interface.

```typescript
interface DesignEditorCanvasProps {
  width: number
  height: number
  initialDesignState?: DesignState
  onDesignChange: (state: DesignState) => void
  onExport: () => Promise<string>
}

interface DesignState {
  version: string
  elements: DesignElement[]
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
}

interface DesignElement {
  id: string
  type: 'text' | 'image'
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  zIndex: number
  // Type-specific properties
  properties: TextProperties | ImageProperties
}

interface TextProperties {
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

interface ImageProperties {
  url: string
  opacity: number
  filters?: string[]
}
```

**Responsibilities:**
- Initialize and manage Fabric.js canvas instance
- Handle element creation, selection, and manipulation
- Maintain design state synchronization
- Provide undo/redo functionality (20 action history)
- Export canvas to high-resolution PNG



### DesignToolbar Component

Provides primary actions for design creation.

```typescript
interface DesignToolbarProps {
  onAddText: () => void
  onAddImage: (file: File) => Promise<void>
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
}
```

**Responsibilities:**
- Trigger element creation actions
- Handle image file uploads
- Provide undo/redo controls
- Enable element deletion

### ElementPropertiesPanel Component

Displays and controls properties of the selected design element.

```typescript
interface ElementPropertiesPanelProps {
  selectedElement: DesignElement | null
  onPropertyChange: (property: string, value: any) => void
  onLayerChange: (direction: 'forward' | 'backward' | 'front' | 'back') => void
  availableFonts: FontDefinition[]
}

interface FontDefinition {
  family: string
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting'
  variants: string[]
  googleFontsUrl: string
}
```

**Responsibilities:**
- Display properties of selected element
- Provide controls for text styling
- Provide controls for image properties
- Handle layer order changes
- Load and apply fonts dynamically



### FontService

Manages font loading and caching from Google Fonts API.

```typescript
interface FontService {
  loadFont(fontFamily: string): Promise<void>
  getFontList(): FontDefinition[]
  isFontLoaded(fontFamily: string): boolean
}

class FontServiceImpl implements FontService {
  private loadedFonts: Set<string>
  private fontCache: Map<string, FontDefinition>
  
  async loadFont(fontFamily: string): Promise<void> {
    // Load font via Google Fonts API
    // Add to document head
    // Wait for font to be ready
    // Cache loaded state
  }
  
  getFontList(): FontDefinition[] {
    // Return curated list of 20+ fonts
    // Categories: serif, sans-serif, display, handwriting
  }
}
```

**Curated Font List (20+ fonts):**
- Serif: Playfair Display, Merriweather, Lora, Crimson Text
- Sans-serif: Inter, Roboto, Open Sans, Montserrat, Poppins
- Display: Bebas Neue, Righteous, Fredoka One, Pacifico
- Handwriting: Dancing Script, Caveat, Satisfy, Kalam

### DesignExportService

Handles exporting designs to print-ready files.

```typescript
interface DesignExportService {
  exportToPNG(canvas: fabric.Canvas, targetDPI: number): Promise<Blob>
  uploadDesignFile(blob: Blob, filename: string): Promise<string>
}

class DesignExportServiceImpl implements DesignExportService {
  async exportToPNG(canvas: fabric.Canvas, targetDPI: number = 300): Promise<Blob> {
    // Calculate scale factor for 300 DPI
    // Scale canvas dimensions
    // Export to PNG with high quality
    // Return blob
  }
  
  async uploadDesignFile(blob: Blob, filename: string): Promise<string> {
    // Convert blob to File
    // Use existing fileService.uploadDesign()
    // Return public URL
  }
}
```

**DPI Calculation:**
- Screen DPI: 96 (standard)
- Target DPI: 300 (print quality)
- Scale factor: 300 / 96 = 3.125
- Canvas scaled by 3.125x before export



## Data Models

### Database Schema Extension

Add a new field to the existing `products` table:

```sql
ALTER TABLE products 
ADD COLUMN design_data JSONB;

COMMENT ON COLUMN products.design_data IS 'Serialized design state for editor (DesignState JSON)';
```

The `design_data` field stores the complete DesignState, allowing designs to be reopened and edited. The existing `design_url` field continues to store the exported PNG file URL.

### DesignState JSON Structure

```json
{
  "version": "1.0",
  "canvasWidth": 4500,
  "canvasHeight": 5400,
  "backgroundColor": "#ffffff",
  "elements": [
    {
      "id": "text-1",
      "type": "text",
      "position": { "x": 100, "y": 200 },
      "size": { "width": 300, "height": 80 },
      "rotation": 0,
      "zIndex": 1,
      "properties": {
        "content": "Custom Design",
        "fontFamily": "Montserrat",
        "fontSize": 48,
        "color": "#000000",
        "textAlign": "center",
        "letterSpacing": 0,
        "lineHeight": 1.2,
        "fontWeight": "bold",
        "fontStyle": "normal"
      }
    },
    {
      "id": "image-1",
      "type": "image",
      "position": { "x": 150, "y": 300 },
      "size": { "width": 200, "height": 200 },
      "rotation": 15,
      "zIndex": 0,
      "properties": {
        "url": "https://storage.url/image.png",
        "opacity": 1.0
      }
    }
  ]
}
```



### ProductForm Integration

Extend the existing ProductForm to support design editor mode:

```typescript
interface ProductFormData {
  // Existing fields
  name: string
  description: string
  price: number
  gelatoProductUid: string
  sizes: string[]
  colors: ProductColor[]
  designUrl: string
  
  // New fields
  designMode: 'editor' | 'upload'
  designData?: DesignState
}
```

The form will show a mode selector allowing users to choose between:
1. **Design Editor**: Opens the visual editor
2. **Upload File**: Uses existing DesignUploader component

This maintains backward compatibility while adding new functionality.



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection Analysis

After analyzing all acceptance criteria, several redundancies were identified:

- **5.2 and 5.5**: Both test that elements render in layer order - consolidated into single property
- **8.3 and 8.4**: Property preservation is part of round-trip testing - combined into comprehensive round-trip property
- **12.3 and 12.4**: Both test selection handles appearing - combined into single property about selection UI

The following properties represent the unique, testable behaviors of the system:



### Property 1: Gelato Product Display Completeness

*For any* Gelato product returned by the API, the displayed product information should include title, base price, and available sizes.

**Validates: Requirements 1.2**

### Property 2: Product Selection Enables Editor

*For any* Gelato product selection, the Design_Editor interface should become enabled and accessible.

**Validates: Requirements 1.5**

### Property 3: Canvas Dimensions Match Print Area

*For any* selected Gelato product, the Design_Editor canvas dimensions should equal the product's print area dimensions.

**Validates: Requirements 2.1**

### Property 4: Text Element Creation

*For any* add text action, the canvas element count should increase by one and the new element should be of type text.

**Validates: Requirements 3.1**

### Property 5: Text Property Updates

*For any* text element and any valid property change (font, size, color, alignment), applying the change should update the element's properties to match the new values.

**Validates: Requirements 3.3, 3.5, 3.7**

### Property 6: Image File Type Validation

*For any* uploaded file, the system should accept only PNG, JPEG, or SVG formats and reject all other file types with an error message.

**Validates: Requirements 4.1**

### Property 7: Image Element Creation

*For any* valid image upload, the canvas element count should increase by one and the new element should be of type image.

**Validates: Requirements 4.3**

### Property 8: Image Aspect Ratio Preservation

*For any* image element and any resize operation, the aspect ratio (width/height) should remain constant before and after the resize.

**Validates: Requirements 4.4**

### Property 9: Image Transparency Support

*For any* PNG or SVG image with transparency, the uploaded image element should maintain its transparent regions when rendered on the canvas.

**Validates: Requirements 4.6**



### Property 10: Element Position Updates

*For any* design element and any drag operation, the element's position coordinates should update to reflect the new position.

**Validates: Requirements 5.1**

### Property 11: Layer Order Rendering

*For any* set of overlapping design elements, elements should render in order of their zIndex values, with higher zIndex elements appearing above lower zIndex elements.

**Validates: Requirements 5.2, 5.5**

### Property 12: Layer Order Manipulation

*For any* design element and any layer operation (forward, backward, front, back), the element's zIndex should change correctly: forward/backward by ±1, front to maximum, back to minimum.

**Validates: Requirements 5.3, 5.4**

### Property 13: Top Element Selection

*For any* set of overlapping elements at a click position, clicking should select the element with the highest zIndex at that position.

**Validates: Requirements 5.7**

### Property 14: Mockup Color Updates

*For any* product color selection, the mockup preview should update to display the mockup in the selected color.

**Validates: Requirements 6.3**

### Property 15: Design Export Format

*For any* design state, exporting should produce a PNG file with transparent background.

**Validates: Requirements 7.2**

### Property 16: Export Resolution Scaling

*For any* design with canvas dimensions W×H, the exported image dimensions should be (W × 3.125) × (H × 3.125) to achieve 300 DPI from 96 DPI base.

**Validates: Requirements 7.3**

### Property 17: Export Dimensions Match Print Area

*For any* Gelato product, the exported design dimensions (after DPI scaling) should match the product's print area specifications.

**Validates: Requirements 7.4**

### Property 18: Export Triggers Upload

*For any* successful export operation, the system should upload the generated file to Storage_Service and return a public URL.

**Validates: Requirements 7.6, 7.7**



### Property 19: Design State Serialization

*For any* design state, serializing to JSON should produce valid JSON that can be parsed back into an equivalent design state.

**Validates: Requirements 8.1**

### Property 20: Design State Round Trip

*For any* design state with all element properties (position, size, rotation, text content, fonts, colors), serializing then deserializing should produce an equivalent design state with all properties preserved.

**Validates: Requirements 8.3, 8.4**

### Property 21: Export Maintains Both Artifacts

*For any* design export operation, the system should store both the serialized Design_State (design_data field) and the exported Print_File URL (design_url field).

**Validates: Requirements 8.5**

### Property 22: Editor Export Populates Form

*For any* design created via the Design_Editor, exporting should populate the design_url field in the Product_Form with the exported file URL.

**Validates: Requirements 9.4**

### Property 23: Form Submission Includes Design URL

*For any* Product_Form submission with a design, the submitted product data should include the design_url field.

**Validates: Requirements 9.6**

### Property 24: Error Display

*For any* error condition (upload failure, export failure, validation error), the system should display an error message to the user.

**Validates: Requirements 10.3**

### Property 25: Undo Restores Previous State

*For any* sequence of design actions followed by undo operations, each undo should restore the design state to the state before the corresponding action.

**Validates: Requirements 10.4**

### Property 26: Redo Round Trip

*For any* design action followed by undo then redo, the final state should match the state after the original action.

**Validates: Requirements 10.5**



### Property 27: Element Deletion

*For any* design element, deleting it should remove it from the canvas and decrease the element count by one.

**Validates: Requirements 10.6**

### Property 28: Keyboard Shortcuts

*For any* keyboard shortcut (delete, undo, redo, duplicate), triggering the shortcut should execute the corresponding action.

**Validates: Requirements 10.7**

### Property 29: Font Application

*For any* text element and any font selection, applying the font should update the element's fontFamily property to the selected font.

**Validates: Requirements 11.3**

### Property 30: Font Caching

*For any* font that has been loaded once, subsequent requests to load the same font should use the cached version without making additional API requests.

**Validates: Requirements 11.4**

### Property 31: Font Load Fallback

*For any* font that fails to load, the system should apply a default fallback font and display a warning message.

**Validates: Requirements 11.5**

### Property 32: Element Selection

*For any* design element, clicking on it should select that element and update the selection state.

**Validates: Requirements 12.1**

### Property 33: Canvas Deselection

*For any* click on an empty area of the canvas (no elements at that position), all elements should be deselected.

**Validates: Requirements 12.2**

### Property 34: Selection UI Display

*For any* selected design element, the system should display selection handles including bounding box, resize handles, and rotation handles.

**Validates: Requirements 12.3, 12.4**

### Property 35: Resize Handle Interaction

*For any* design element and any resize handle drag operation, the element's size should update to reflect the drag distance and direction.

**Validates: Requirements 12.5**

### Property 36: Rotation Handle Interaction

*For any* design element and any rotation handle drag operation, the element's rotation angle should update based on the angle from the element center to the drag position.

**Validates: Requirements 12.6**

### Property 37: Canvas Boundary Constraint

*For any* design element at any time, the element's position should remain within the canvas boundaries (0 ≤ x ≤ canvasWidth, 0 ≤ y ≤ canvasHeight).

**Validates: Requirements 12.7**



## Error Handling

The system implements comprehensive error handling across all operations:

### File Upload Errors

- **Invalid file type**: Display error message listing accepted formats (PNG, JPEG, SVG)
- **File too large**: Display error with maximum size (10MB) and current file size
- **Upload failure**: Display error with retry option and technical details for debugging
- **Network errors**: Display connection error with retry option

### Font Loading Errors

- **Font load failure**: Fall back to system default font (Arial/Helvetica)
- **API unavailable**: Use cached fonts if available, otherwise use system fonts
- **Display warning**: Show non-intrusive warning message about font fallback

### Export Errors

- **Canvas export failure**: Display error message and preserve current design state
- **Storage upload failure**: Retry upload up to 3 times with exponential backoff
- **Insufficient permissions**: Display clear message about storage configuration
- **Network timeout**: Display timeout error with retry option

### Design State Errors

- **Deserialization failure**: Display error and offer to start fresh design
- **Invalid JSON**: Log error details and prevent corruption of existing data
- **Missing properties**: Use default values for missing properties with warning
- **Version mismatch**: Attempt migration or display compatibility warning

### User Input Validation

- **Out of range values**: Clamp to valid range and display corrected value
- **Invalid color format**: Display error and keep previous valid color
- **Empty required fields**: Prevent submission and highlight missing fields
- **Invalid element operations**: Prevent operation and display reason

All errors are logged to console with detailed context for debugging while showing user-friendly messages in the UI.



## Testing Strategy

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive coverage.

### Unit Testing

Unit tests focus on:

- **Specific examples**: Concrete scenarios like "adding a text element with specific properties"
- **Edge cases**: Boundary conditions (font size limits, file size limits, empty canvas)
- **Integration points**: Component interactions with ProductForm, Gelato API, Storage Service
- **Error conditions**: Specific error scenarios and their handling
- **UI interactions**: Button clicks, keyboard shortcuts, drag operations

**Example unit tests:**
- Font library contains at least 20 fonts
- Empty canvas displays instructional text
- File upload rejects files over 10MB
- Export fails gracefully when storage is unavailable
- Both design modes (editor/upload) are selectable

### Property-Based Testing

Property tests verify universal properties across randomized inputs using a property-based testing library (fast-check for TypeScript/JavaScript).

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: design-editor-system, Property N: [property description]`
- Generators for: design states, elements, colors, positions, dimensions, fonts

**Property test examples:**
- Property 8: Image aspect ratio preservation across random resize operations
- Property 11: Layer order rendering for random element arrangements
- Property 20: Design state round-trip for random design configurations
- Property 26: Undo/redo round-trip for random action sequences
- Property 37: Canvas boundary constraints for random element positions

### Testing Library Selection

**Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check)
- Mature TypeScript/JavaScript property testing library
- Excellent TypeScript support and type inference
- Built-in generators for common types
- Shrinking support for minimal failing examples

### Test Organization

```
__tests__/
├── unit/
│   ├── components/
│   │   ├── DesignEditorCanvas.test.tsx
│   │   ├── DesignToolbar.test.tsx
│   │   ├── ElementPropertiesPanel.test.tsx
│   │   └── ProductForm.integration.test.tsx
│   └── services/
│       ├── FontService.test.ts
│       ├── DesignExportService.test.ts
│       └── DesignStateSerializer.test.ts
└── properties/
    ├── design-editor-properties.test.ts
    ├── layer-management-properties.test.ts
    ├── export-properties.test.ts
    └── state-persistence-properties.test.ts
```

### Coverage Goals

- **Unit test coverage**: 80%+ for all components and services
- **Property test coverage**: All 37 correctness properties implemented
- **Integration test coverage**: All integration points with existing system
- **Edge case coverage**: All boundary conditions and error scenarios

### Continuous Integration

- Run all tests on every commit
- Property tests run with 100 iterations in CI
- Fail build on any test failure
- Generate coverage reports
- Track property test shrinking results for regression detection

