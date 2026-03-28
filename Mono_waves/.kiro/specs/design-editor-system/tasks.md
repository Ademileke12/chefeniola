# Implementation Plan: Design Editor & Product Creation System

## Overview

This implementation plan breaks down the Design Editor & Product Creation System into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated throughout to validate functionality early. The plan maintains backward compatibility with existing product management features while adding comprehensive design editor capabilities.

## Tasks

- [x] 1. Set up Fabric.js and create base canvas component
  - Install fabric package and TypeScript types
  - Create DesignEditorCanvas component with basic Fabric.js initialization
  - Implement canvas sizing based on product print area dimensions
  - Add empty state with instructional text
  - _Requirements: 2.1, 2.4_

- [x] 1.1 Write property test for canvas dimensions
  - **Property 3: Canvas Dimensions Match Print Area**
  - **Validates: Requirements 2.1**

- [x] 2. Implement text element creation and basic manipulation
  - [x] 2.1 Add text element creation functionality
    - Implement "Add Text" button in toolbar
    - Create text element on canvas with default properties
    - Handle text element selection and deselection
    - _Requirements: 3.1, 12.1, 12.2_
  
  - [x] 2.2 Write property tests for text element operations
    - **Property 4: Text Element Creation**
    - **Property 32: Element Selection**
    - **Property 33: Canvas Deselection**
    - **Validates: Requirements 3.1, 12.1, 12.2**


- [x] 3. Implement text styling controls
  - [x] 3.1 Create ElementPropertiesPanel component
    - Build properties panel UI for text elements
    - Add controls for font size, color, and alignment
    - Implement property change handlers
    - _Requirements: 3.3, 3.5, 3.7_
  
  - [x] 3.2 Implement text property updates
    - Connect property controls to Fabric.js text objects
    - Handle font size changes (8pt to 200pt range)
    - Handle color changes with hex input and color picker
    - Handle alignment changes (left, center, right, justify)
    - Add letter spacing and line height controls
    - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.9_
  
  - [x] 3.3 Write property test for text property updates
    - **Property 5: Text Property Updates**
    - **Validates: Requirements 3.3, 3.5, 3.7**
  
  - [x] 3.4 Write unit tests for text styling edge cases
    - Test font size boundaries (8pt, 200pt)
    - Test letter spacing boundaries (-50, 200)
    - Test line height boundaries (0.5, 3.0)
    - _Requirements: 3.4, 3.8, 3.9_

- [ ] 4. Implement font library and loading
  - [x] 4.1 Create FontService
    - Implement FontService class with Google Fonts integration
    - Define curated list of 20+ fonts (serif, sans-serif, display, handwriting)
    - Implement dynamic font loading via Google Fonts API
    - Add font caching mechanism
    - Implement fallback handling for font load failures
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 4.2 Write unit test for font library size
    - Test that font list contains at least 20 fonts
    - Test that fonts cover all categories
    - _Requirements: 11.2_
  
  - [x] 4.3 Write property tests for font operations
    - **Property 29: Font Application**
    - **Property 30: Font Caching**
    - **Property 31: Font Load Fallback**
    - **Validates: Requirements 11.3, 11.4, 11.5**

- [x] 5. Checkpoint - Ensure text functionality works
  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. Implement image element upload and creation
  - [x] 6.1 Add image upload functionality
    - Implement "Add Image" button with file picker
    - Add file type validation (PNG, JPEG, SVG only)
    - Add file size validation (10MB limit)
    - Create image element on canvas after successful upload
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 6.2 Write property tests for image operations
    - **Property 6: Image File Type Validation**
    - **Property 7: Image Element Creation**
    - **Validates: Requirements 4.1, 4.3**
  
  - [x] 6.3 Write unit test for file size limit
    - Test that files over 10MB are rejected
    - _Requirements: 4.2_

- [x] 7. Implement image manipulation controls
  - [x] 7.1 Add image resize and rotation
    - Implement resize handles with aspect ratio preservation
    - Implement rotation handles
    - Add image transparency support for PNG/SVG
    - Update ElementPropertiesPanel for image elements
    - _Requirements: 4.4, 4.5, 4.6, 12.3, 12.4, 12.5, 12.6_
  
  - [x] 7.2 Write property tests for image manipulation
    - **Property 8: Image Aspect Ratio Preservation**
    - **Property 9: Image Transparency Support**
    - **Property 34: Selection UI Display**
    - **Property 35: Resize Handle Interaction**
    - **Property 36: Rotation Handle Interaction**
    - **Validates: Requirements 4.4, 4.6, 12.3, 12.4, 12.5, 12.6**

- [x] 8. Implement element positioning and layering
  - [x] 8.1 Add drag-and-drop positioning
    - Implement element dragging with position updates
    - Add canvas boundary constraints
    - _Requirements: 5.1, 12.7_
  
  - [x] 8.2 Implement layer management
    - Add layer order controls (forward, backward, front, back)
    - Implement zIndex-based rendering
    - Handle click selection of overlapping elements (select top-most)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 8.3 Write property tests for positioning and layering
    - **Property 10: Element Position Updates**
    - **Property 11: Layer Order Rendering**
    - **Property 12: Layer Order Manipulation**
    - **Property 13: Top Element Selection**
    - **Property 37: Canvas Boundary Constraint**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 12.7**

- [x] 9. Checkpoint - Ensure element manipulation works
  - Ensure all tests pass, ask the user if questions arise.


- [x] 10. Implement undo/redo functionality
  - [x] 10.1 Create history management system
    - Implement action history stack (20 actions)
    - Add undo functionality to restore previous states
    - Add redo functionality to reverse undo operations
    - Integrate with all design operations
    - _Requirements: 10.4, 10.5_
  
  - [x] 10.2 Write property tests for undo/redo
    - **Property 25: Undo Restores Previous State**
    - **Property 26: Redo Round Trip**
    - **Validates: Requirements 10.4, 10.5**

- [x] 11. Implement design toolbar and keyboard shortcuts
  - [x] 11.1 Create DesignToolbar component
    - Build toolbar UI with action buttons
    - Add undo/redo buttons with enabled/disabled states
    - Add delete element button
    - _Requirements: 10.6_
  
  - [x] 11.2 Implement keyboard shortcuts
    - Add keyboard event handlers for delete, undo, redo, duplicate
    - Implement element deletion functionality
    - _Requirements: 10.6, 10.7_
  
  - [x] 11.3 Write property tests for toolbar operations
    - **Property 27: Element Deletion**
    - **Property 28: Keyboard Shortcuts**
    - **Validates: Requirements 10.6, 10.7**

- [x] 12. Implement design state serialization and persistence
  - [x] 12.1 Create design state serializer
    - Implement DesignState to JSON serialization
    - Implement JSON to DesignState deserialization
    - Handle all element types and properties
    - Add version field for future compatibility
    - _Requirements: 8.1, 8.3, 8.4_
  
  - [x] 12.2 Write property tests for serialization
    - **Property 19: Design State Serialization**
    - **Property 20: Design State Round Trip**
    - **Validates: Requirements 8.1, 8.3, 8.4**
  
  - [x] 12.3 Integrate with database storage
    - Add design_data field to products table migration
    - Implement save functionality to store design_data
    - Implement load functionality to restore design from design_data
    - _Requirements: 8.2_
  
  - [x] 12.4 Write property test for database persistence
    - **Property 21: Export Maintains Both Artifacts**
    - **Validates: Requirements 8.5**

- [x] 13. Checkpoint - Ensure state management works
  - Ensure all tests pass, ask the user if questions arise.


- [-] 14. Implement design export to print-ready files
  - [x] 14.1 Create DesignExportService
    - Implement canvas scaling for 300 DPI (3.125x scale factor)
    - Implement PNG export with transparent background
    - Ensure export dimensions match Gelato print area specs
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [x] 14.2 Integrate export with file upload
    - Connect export to existing fileService.uploadDesign()
    - Return public URL after successful upload
    - Handle export and upload errors gracefully
    - _Requirements: 7.6, 7.7_
  
  - [x] 14.3 Write property tests for export functionality
    - **Property 15: Design Export Format**
    - **Property 16: Export Resolution Scaling**
    - **Property 17: Export Dimensions Match Print Area**
    - **Property 18: Export Triggers Upload**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.6, 7.7**

- [x] 15. Enhance MockupPreview with design overlay
  - [x] 15.1 Update MockupPreview component
    - Add design overlay rendering on mockup images
    - Implement real-time preview updates when design changes
    - Add front and back view support
    - Handle color-specific mockup display
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 15.2 Write unit test for mockup views
    - Test that both front and back views are displayed
    - _Requirements: 6.2_
  
  - [x] 15.3 Write property test for mockup color updates
    - **Property 14: Mockup Color Updates**
    - **Validates: Requirements 6.3**
  
  - [x] 15.4 Write unit test for empty mockup state
    - Test that empty design shows mockup without overlay
    - _Requirements: 6.5_

- [x] 16. Integrate design editor with ProductForm
  - [x] 16.1 Add design mode selector to ProductForm
    - Add UI toggle between "Design Editor" and "Upload File" modes
    - Conditionally render DesignEditorCanvas or DesignUploader
    - Maintain existing DesignUploader for backward compatibility
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.2 Connect design editor to form submission
    - Populate design_url field when design is exported
    - Include design_data in form submission
    - Preserve existing form validation and submission logic
    - _Requirements: 9.4, 9.5, 9.6_
  
  - [x] 16.3 Write unit test for mode selection
    - Test that both modes are selectable
    - _Requirements: 9.2_
  
  - [x] 16.4 Write property tests for form integration
    - **Property 22: Editor Export Populates Form**
    - **Property 23: Form Submission Includes Design URL**
    - **Validates: Requirements 9.4, 9.6**


- [ ] 17. Implement comprehensive error handling
  - [ ] 17.1 Add error handling for file operations
    - Handle invalid file types with clear error messages
    - Handle file size errors with size information
    - Handle upload failures with retry options
    - Handle network errors gracefully
    - _Requirements: 10.3_
  
  - [ ] 17.2 Add error handling for font operations
    - Implement font load failure fallback to system fonts
    - Display warning messages for font issues
    - Handle Google Fonts API unavailability
    - _Requirements: 10.3_
  
  - [ ] 17.3 Add error handling for export operations
    - Handle canvas export failures
    - Implement retry logic for storage uploads (3 attempts)
    - Handle storage permission errors
    - Handle network timeouts
    - _Requirements: 10.3_
  
  - [ ] 17.4 Add error handling for design state operations
    - Handle deserialization failures gracefully
    - Handle invalid JSON with error logging
    - Use default values for missing properties
    - Handle version mismatches
    - _Requirements: 10.3_
  
  - [ ] 17.5 Write property test for error display
    - **Property 24: Error Display**
    - **Validates: Requirements 10.3**

- [ ] 18. Add Gelato product integration
  - [ ] 18.1 Connect to Gelato catalog
    - Fetch Gelato products on component mount
    - Display products with required information
    - Handle product selection to enable editor
    - Load product colors and print areas
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ] 18.2 Write property tests for Gelato integration
    - **Property 1: Gelato Product Display Completeness**
    - **Property 2: Product Selection Enables Editor**
    - **Validates: Requirements 1.2, 1.5**

- [ ] 19. Final checkpoint - Integration testing
  - [ ] 19.1 Test complete workflow
    - Test product selection → design creation → export → save
    - Test design editing → re-export → update
    - Test mode switching between editor and upload
    - Verify backward compatibility with existing features
  
  - [ ] 19.2 Verify all property tests pass
    - Run all 37 property tests with 100 iterations each
    - Verify no regressions in existing functionality
    - Check test coverage meets 80%+ goal

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout development
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and integration points
- The implementation maintains backward compatibility with existing product upload workflow
- All new components integrate seamlessly with existing admin panel structure
