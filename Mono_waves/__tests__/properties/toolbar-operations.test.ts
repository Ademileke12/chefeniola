/**
 * Property-Based Tests for Toolbar Operations
 * Feature: design-editor-system
 * 
 * These tests validate the correctness properties of toolbar operations
 * including element deletion and keyboard shortcuts using property-based
 * testing with fast-check.
 */

import * as fc from 'fast-check'

// Mock canvas for testing
class MockCanvas {
  private objects: any[] = []
  private activeObject: any = null
  private listeners: Map<string, Function[]> = new Map()

  add(obj: any) {
    this.objects.push(obj)
    this.trigger('object:added', { target: obj })
  }

  remove(obj: any) {
    const index = this.objects.indexOf(obj)
    if (index > -1) {
      this.objects.splice(index, 1)
      this.trigger('object:removed', { target: obj })
      if (this.activeObject === obj) {
        this.activeObject = null
        this.trigger('selection:cleared', {})
      }
    }
  }

  getObjects() {
    return [...this.objects]
  }

  setActiveObject(obj: any) {
    this.activeObject = obj
    this.trigger('selection:created', { selected: [obj] })
  }

  getActiveObject() {
    return this.activeObject
  }

  discardActiveObject() {
    this.activeObject = null
    this.trigger('selection:cleared', {})
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  trigger(event: string, data: any) {
    const handlers = this.listeners.get(event) || []
    handlers.forEach(handler => handler(data))
  }

  renderAll() {
    // No-op for testing
  }
}

// Element deletion handler that mimics DesignEditorCanvas
class ElementManager {
  private canvas: MockCanvas
  private selectedElement: any = null

  constructor(canvas: MockCanvas) {
    this.canvas = canvas

    // Listen for selection changes
    canvas.on('selection:created', (e: any) => {
      this.selectedElement = e.selected?.[0] || null
    })

    canvas.on('selection:cleared', () => {
      this.selectedElement = null
    })
  }

  deleteSelected() {
    if (!this.selectedElement) return false

    this.canvas.remove(this.selectedElement)
    this.selectedElement = null
    return true
  }

  getSelectedElement() {
    return this.selectedElement
  }

  hasSelection() {
    return this.selectedElement !== null
  }
}

// Keyboard shortcut handler
class KeyboardShortcutHandler {
  private elementManager: ElementManager
  private onUndo: () => void
  private onRedo: () => void
  private onDuplicate: () => void

  constructor(
    elementManager: ElementManager,
    onUndo: () => void,
    onRedo: () => void,
    onDuplicate: () => void
  ) {
    this.elementManager = elementManager
    this.onUndo = onUndo
    this.onRedo = onRedo
    this.onDuplicate = onDuplicate
  }

  handleKeyDown(event: {
    key: string
    ctrlKey?: boolean
    metaKey?: boolean
    shiftKey?: boolean
    target?: { tagName?: string; isContentEditable?: boolean }
  }) {
    // Ignore keyboard shortcuts when typing in text elements
    const target = event.target
    if (
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    ) {
      return { handled: false, action: null }
    }

    // Delete: Delete or Backspace key
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const deleted = this.elementManager.deleteSelected()
      return { handled: true, action: 'delete', success: deleted }
    }

    // Undo: Ctrl+Z (or Cmd+Z on Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      this.onUndo()
      return { handled: true, action: 'undo' }
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y / Cmd+Shift+Z on Mac)
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === 'y' || (event.key === 'z' && event.shiftKey))
    ) {
      this.onRedo()
      return { handled: true, action: 'redo' }
    }

    // Duplicate: Ctrl+D (or Cmd+D on Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      this.onDuplicate()
      return { handled: true, action: 'duplicate' }
    }

    return { handled: false, action: null }
  }
}

// Arbitraries for generating test data
const elementArbitrary = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('text', 'image'),
  left: fc.integer({ min: 0, max: 500 }),
  top: fc.integer({ min: 0, max: 500 }),
  width: fc.integer({ min: 50, max: 300 }),
  height: fc.integer({ min: 20, max: 100 }),
})

const keyboardEventArbitrary = fc.oneof(
  // Delete key
  fc.record({
    key: fc.constantFrom('Delete', 'Backspace'),
    ctrlKey: fc.constant(false),
    metaKey: fc.constant(false),
    shiftKey: fc.constant(false),
  }),
  // Undo: Ctrl+Z
  fc.record({
    key: fc.constant('z'),
    ctrlKey: fc.boolean(),
    metaKey: fc.boolean(),
    shiftKey: fc.constant(false),
  }).filter(e => e.ctrlKey || e.metaKey),
  // Redo: Ctrl+Y
  fc.record({
    key: fc.constant('y'),
    ctrlKey: fc.boolean(),
    metaKey: fc.boolean(),
    shiftKey: fc.constant(false),
  }).filter(e => e.ctrlKey || e.metaKey),
  // Redo: Ctrl+Shift+Z
  fc.record({
    key: fc.constant('z'),
    ctrlKey: fc.boolean(),
    metaKey: fc.boolean(),
    shiftKey: fc.constant(true),
  }).filter(e => e.ctrlKey || e.metaKey),
  // Duplicate: Ctrl+D
  fc.record({
    key: fc.constant('d'),
    ctrlKey: fc.boolean(),
    metaKey: fc.boolean(),
    shiftKey: fc.constant(false),
  }).filter(e => e.ctrlKey || e.metaKey)
)

describe('Property-Based Tests: Toolbar Operations', () => {
  /**
   * Property 27: Element Deletion
   * 
   * For any design element, deleting it should remove it from the canvas
   * and decrease the element count by one.
   * 
   * Validates: Requirements 10.6
   */
  it('Property 27: Element Deletion', () => {
    fc.assert(
      fc.property(
        fc.array(elementArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (elements, deleteIndex) => {
          // Adjust deleteIndex to be within bounds
          const actualDeleteIndex = deleteIndex % elements.length

          const canvas = new MockCanvas()
          const manager = new ElementManager(canvas)

          // Add all elements to canvas
          elements.forEach(el => canvas.add(el))

          const initialCount = canvas.getObjects().length
          expect(initialCount).toBe(elements.length)

          // Select the element to delete
          const elementToDelete = canvas.getObjects()[actualDeleteIndex]
          canvas.setActiveObject(elementToDelete)

          // Verify element is selected
          expect(manager.hasSelection()).toBe(true)
          expect(manager.getSelectedElement()).toBe(elementToDelete)

          // Delete the selected element
          const deleted = manager.deleteSelected()

          // Verify deletion succeeded
          expect(deleted).toBe(true)

          // Verify element count decreased by one
          const finalCount = canvas.getObjects().length
          expect(finalCount).toBe(initialCount - 1)

          // Verify the specific element was removed
          expect(canvas.getObjects()).not.toContain(elementToDelete)

          // Verify no element is selected after deletion
          expect(manager.hasSelection()).toBe(false)
          expect(manager.getSelectedElement()).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 28: Keyboard Shortcuts
   * 
   * For any keyboard shortcut (delete, undo, redo, duplicate),
   * triggering the shortcut should execute the corresponding action.
   * 
   * Validates: Requirements 10.7
   */
  it('Property 28: Keyboard Shortcuts', () => {
    fc.assert(
      fc.property(keyboardEventArbitrary, (event) => {
        const canvas = new MockCanvas()
        const manager = new ElementManager(canvas)

        // Track which callbacks were called
        let undoCalled = false
        let redoCalled = false
        let duplicateCalled = false

        const handler = new KeyboardShortcutHandler(
          manager,
          () => {
            undoCalled = true
          },
          () => {
            redoCalled = true
          },
          () => {
            duplicateCalled = true
          }
        )

        // Add an element and select it for delete operations
        const element = { id: '1', type: 'text', left: 100, top: 100 }
        canvas.add(element)
        canvas.setActiveObject(element)

        // Handle the keyboard event
        const result = handler.handleKeyDown(event)

        // Verify the event was handled
        expect(result.handled).toBe(true)

        // Verify the correct action was triggered based on the key combination
        if (event.key === 'Delete' || event.key === 'Backspace') {
          expect(result.action).toBe('delete')
          expect(result.success).toBe(true)
          expect(canvas.getObjects().length).toBe(0)
        } else if (event.key === 'z' && !event.shiftKey) {
          expect(result.action).toBe('undo')
          expect(undoCalled).toBe(true)
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          expect(result.action).toBe('redo')
          expect(redoCalled).toBe(true)
        } else if (event.key === 'd') {
          expect(result.action).toBe('duplicate')
          expect(duplicateCalled).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Delete without selection does nothing
   * 
   * For any delete operation when no element is selected,
   * the canvas should remain unchanged.
   */
  it('Property: Delete without selection does nothing', () => {
    fc.assert(
      fc.property(
        fc.array(elementArbitrary, { minLength: 1, maxLength: 10 }),
        (elements) => {
          const canvas = new MockCanvas()
          const manager = new ElementManager(canvas)

          // Add elements but don't select any
          elements.forEach(el => canvas.add(el))

          const initialCount = canvas.getObjects().length
          expect(manager.hasSelection()).toBe(false)

          // Try to delete without selection
          const deleted = manager.deleteSelected()

          // Verify deletion failed
          expect(deleted).toBe(false)

          // Verify element count unchanged
          expect(canvas.getObjects().length).toBe(initialCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Keyboard shortcuts ignored in text input
   * 
   * For any keyboard shortcut when focus is in a text input,
   * the shortcut should not be handled.
   */
  it('Property: Keyboard shortcuts ignored in text input', () => {
    fc.assert(
      fc.property(keyboardEventArbitrary, (event) => {
        const canvas = new MockCanvas()
        const manager = new ElementManager(canvas)

        const handler = new KeyboardShortcutHandler(
          manager,
          () => {},
          () => {},
          () => {}
        )

        // Simulate event from text input
        const inputEvent = {
          ...event,
          target: { tagName: 'INPUT', isContentEditable: false },
        }

        // Handle the keyboard event
        const result = handler.handleKeyDown(inputEvent)

        // Verify the event was NOT handled
        expect(result.handled).toBe(false)
        expect(result.action).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Multiple deletions
   * 
   * For any sequence of element selections and deletions,
   * each deletion should remove exactly one element.
   */
  it('Property: Multiple deletions remove elements sequentially', () => {
    fc.assert(
      fc.property(
        fc.array(elementArbitrary, { minLength: 3, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (elements, deleteIndices) => {
          const canvas = new MockCanvas()
          const manager = new ElementManager(canvas)

          // Add all elements
          elements.forEach(el => canvas.add(el))

          let currentCount = elements.length

          // Delete elements one by one
          deleteIndices.forEach(index => {
            const objects = canvas.getObjects()
            if (objects.length === 0) return

            // Select element at index (wrap around if needed)
            const actualIndex = index % objects.length
            const elementToDelete = objects[actualIndex]
            canvas.setActiveObject(elementToDelete)

            // Delete
            const deleted = manager.deleteSelected()
            expect(deleted).toBe(true)

            // Verify count decreased
            currentCount--
            expect(canvas.getObjects().length).toBe(currentCount)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
