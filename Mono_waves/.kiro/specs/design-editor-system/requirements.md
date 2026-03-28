# Requirements Document: Design Editor & Product Creation System

## Introduction

The Design Editor & Product Creation System is an enhancement to the existing Mono Waves e-commerce platform that enables administrators to create custom product designs through a visual editor interface. This feature integrates with the existing Gelato API product catalog and file upload system, allowing admins to design products with text and images, preview them on product mockups, and generate print-ready design files for fulfillment.

This system extends the current basic file upload workflow by providing a comprehensive design creation tool while maintaining backward compatibility with existing product management functionality.

## Glossary

- **Design_Editor**: The visual interface component that allows users to create and manipulate designs with text and images
- **Canvas**: The editable area within the Design_Editor where design elements are placed and arranged
- **Design_Element**: An individual component within a design (text or image)
- **Layer**: A stacking order position for Design_Elements, determining which elements appear above others
- **Mockup_Generator**: The system component that renders designs onto product preview images
- **Print_File**: The final exported image file in print-ready format for Gelato fulfillment
- **Product_Form**: The existing admin component for creating and editing products
- **Gelato_Catalog**: The collection of available print-on-demand products from Gelato API
- **Design_State**: The complete representation of a design including all elements, positions, and properties
- **Font_Library**: The collection of available typefaces for text elements
- **Storage_Service**: The Supabase storage system for persisting design files


## Requirements

### Requirement 1: Gelato Product Selection

**User Story:** As an admin, I want to browse and select products from the Gelato catalog, so that I can choose which product type to design for.

#### Acceptance Criteria

1. WHEN the admin accesses the product creation workflow, THE System SHALL display available products from the Gelato_Catalog
2. WHEN displaying Gelato products, THE System SHALL show product title, base price, and available sizes
3. WHEN the admin selects a Gelato product, THE System SHALL load the product's available colors and print areas
4. THE System SHALL maintain the existing Gelato API integration without modification
5. WHEN a Gelato product is selected, THE System SHALL enable the Design_Editor interface

### Requirement 2: Design Editor Interface

**User Story:** As an admin, I want to use a visual design editor, so that I can create custom designs without external design software.

#### Acceptance Criteria

1. WHEN the admin opens the Design_Editor, THE System SHALL display a Canvas with dimensions matching the selected product's print area
2. THE Design_Editor SHALL provide tools for adding text elements to the Canvas
3. THE Design_Editor SHALL provide tools for uploading and adding image elements to the Canvas
4. WHEN the Canvas is empty, THE System SHALL display instructional text guiding the user to add elements
5. THE Design_Editor SHALL render all Design_Elements in real-time as changes are made


### Requirement 3: Text Element Creation and Styling

**User Story:** As an admin, I want to add and style text elements, so that I can create text-based designs with custom typography.

#### Acceptance Criteria

1. WHEN the admin adds a text element, THE System SHALL create a new text Design_Element on the Canvas
2. THE System SHALL provide a Font_Library with at least 20 different typefaces
3. WHEN the admin selects a text element, THE System SHALL display controls for font family, size, color, and alignment
4. THE System SHALL allow font sizes from 8pt to 200pt
5. THE System SHALL provide color selection with hex color input and color picker interface
6. WHEN text properties are changed, THE Canvas SHALL update the text element immediately
7. THE System SHALL support text alignment options: left, center, right, and justified
8. THE System SHALL allow letter spacing adjustment from -50 to 200 units
9. THE System SHALL allow line height adjustment from 0.5 to 3.0 multiplier

### Requirement 4: Image Element Management

**User Story:** As an admin, I want to upload and position images in my designs, so that I can incorporate logos, graphics, and photos.

#### Acceptance Criteria

1. WHEN the admin uploads an image file, THE System SHALL validate the file type as PNG, JPEG, or SVG
2. WHEN an image file exceeds 10MB, THE System SHALL reject the upload and display an error message
3. WHEN a valid image is uploaded, THE System SHALL create a new image Design_Element on the Canvas
4. THE System SHALL maintain image aspect ratio during resize operations
5. WHEN an image element is selected, THE System SHALL display resize handles and rotation controls
6. THE System SHALL support image transparency for PNG and SVG formats


### Requirement 5: Element Positioning and Layering

**User Story:** As an admin, I want to position and layer design elements, so that I can create complex compositions with overlapping elements.

#### Acceptance Criteria

1. WHEN the admin clicks and drags a Design_Element, THE System SHALL update its position on the Canvas in real-time
2. THE System SHALL maintain Layer order for all Design_Elements with higher layers appearing above lower layers
3. WHEN the admin selects a Design_Element, THE System SHALL provide controls to move the element forward or backward in Layer order
4. THE System SHALL provide controls to move a Design_Element to the front-most or back-most Layer
5. WHEN Design_Elements overlap, THE System SHALL render them according to their Layer order
6. THE System SHALL display visual indicators showing which Design_Element is currently selected
7. WHEN the admin clicks on overlapping elements, THE System SHALL select the top-most element at that position

### Requirement 6: Live Mockup Preview

**User Story:** As an admin, I want to see my design on product mockups in real-time, so that I can visualize how the final product will look.

#### Acceptance Criteria

1. WHEN the Design_State changes, THE Mockup_Generator SHALL update the preview within 500 milliseconds
2. THE System SHALL display mockup previews for front and back views of the selected product
3. WHEN a product color is selected, THE Mockup_Generator SHALL display the mockup in that color
4. THE Mockup_Generator SHALL scale and position the design correctly on the product mockup image
5. WHEN no design exists, THE System SHALL display the product mockup without any design overlay


### Requirement 7: Design Export and File Generation

**User Story:** As an admin, I want to export my design as a print-ready file, so that it can be sent to Gelato for production.

#### Acceptance Criteria

1. WHEN the admin completes a design, THE System SHALL provide an export function to generate a Print_File
2. THE System SHALL export designs as PNG format with transparent background
3. THE System SHALL export designs at 300 DPI resolution for print quality
4. THE System SHALL export designs with dimensions matching the Gelato product's print area specifications
5. WHEN export is initiated, THE System SHALL generate the Print_File within 5 seconds
6. THE System SHALL upload the generated Print_File to the Storage_Service
7. WHEN upload completes, THE System SHALL return the public URL of the Print_File

### Requirement 8: Design State Persistence

**User Story:** As an admin, I want my design to be saved automatically, so that I can return to edit it later without losing work.

#### Acceptance Criteria

1. WHEN the Design_State changes, THE System SHALL serialize the complete design data to JSON format
2. THE System SHALL store the serialized Design_State in the products table design_data field
3. WHEN the admin reopens a saved product, THE System SHALL deserialize the Design_State and restore all Design_Elements
4. THE System SHALL preserve all element properties including position, size, rotation, text content, fonts, and colors
5. WHEN a design is exported, THE System SHALL maintain both the Design_State and the exported Print_File URL


### Requirement 9: Integration with Existing Product Form

**User Story:** As an admin, I want the design editor to integrate seamlessly with the existing product creation workflow, so that I can use it without disrupting my current process.

#### Acceptance Criteria

1. THE System SHALL integrate the Design_Editor into the existing Product_Form component
2. WHEN the admin creates a new product, THE System SHALL offer both the Design_Editor and the existing file upload option
3. THE System SHALL maintain the existing DesignUploader component for backward compatibility
4. WHEN a design is created via the Design_Editor, THE System SHALL populate the design_url field in the Product_Form
5. THE System SHALL preserve all existing Product_Form validation and submission logic
6. WHEN the Product_Form is submitted, THE System SHALL include the design_url in the product data
7. THE System SHALL not modify the existing gelatoService or fileService implementations

### Requirement 10: Design Editor User Experience

**User Story:** As an admin, I want an intuitive and responsive design interface, so that I can create designs efficiently without technical difficulties.

#### Acceptance Criteria

1. WHEN the admin performs any action in the Design_Editor, THE System SHALL provide visual feedback within 100 milliseconds
2. THE System SHALL display loading indicators when processing operations that take longer than 200 milliseconds
3. WHEN an error occurs, THE System SHALL display a clear error message describing the issue and suggested resolution
4. THE System SHALL provide undo functionality for the last 20 design actions
5. THE System SHALL provide redo functionality to reverse undo operations
6. WHEN the admin deletes a Design_Element, THE System SHALL remove it from the Canvas and update the Layer order
7. THE System SHALL provide keyboard shortcuts for common operations: delete element, undo, redo, and duplicate element


### Requirement 11: Font Library Management

**User Story:** As an admin, I want access to a diverse font library, so that I can create designs with varied typography styles.

#### Acceptance Criteria

1. THE System SHALL load fonts from Google Fonts API
2. THE System SHALL provide at least 20 pre-selected fonts covering different style categories: serif, sans-serif, display, and handwriting
3. WHEN a font is selected, THE System SHALL load the font files and apply them to the text element
4. THE System SHALL cache loaded fonts to improve performance on subsequent uses
5. WHEN a font fails to load, THE System SHALL fall back to a system default font and display a warning message

### Requirement 12: Canvas Interaction and Selection

**User Story:** As an admin, I want to interact with design elements naturally, so that I can work efficiently without confusion.

#### Acceptance Criteria

1. WHEN the admin clicks on a Design_Element, THE System SHALL select that element and display selection handles
2. WHEN the admin clicks on an empty area of the Canvas, THE System SHALL deselect all elements
3. WHEN a Design_Element is selected, THE System SHALL display a bounding box with resize handles at corners and edges
4. THE System SHALL display rotation handles when a Design_Element is selected
5. WHEN the admin drags a resize handle, THE System SHALL update the element size in real-time
6. WHEN the admin drags a rotation handle, THE System SHALL rotate the element around its center point
7. THE System SHALL constrain element positions to remain within the Canvas boundaries
