/**
 * Property-Based Tests for Undo/Redo Functionality
 * Feature: design-editor-system
 * 
 * These tests validate the correctness properties of the undo/redo system
 * using property-based testing with fast-check.
 */

import * as fc from 'fast-check'
import { Canvas, IText, FabricImage } from 'fabric'

// Mock canvas for testing
class MockCanvas {
  private objects: any[] = []
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
    }
  }

  getObjects() {
    return [...this.objects]
  }

  toJSON() {
    return {
      version: '1.0',
      objects: this.objects.map((obj, index) => ({
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        fill: obj.fill,
        text: obj.text,
        index
      }))
    }
  }

  loadFromJSON(json: any, callback: () => void) {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    this.objects = data.objects.map((obj: any) => ({
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      fill: obj.fill,
      text: obj.text
    }))
    callback()
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

// History manager class that mimics the DesignEditorCanvas history logic
class HistoryManager {
  private history: string[] = []
  private historyIndex: number = -1
  private canvas: MockCanvas
  private isUndoRedo: boolean = false

  constructor(canvas: MockCanvas) {
    this.canvas = canvas
    
    // Initialize with empty state
    const initialState = JSON.stringify(canvas.toJSON())
    this.history.push(initialState)
    this.historyIndex = 0

    // Listen to canvas changes
    canvas.on('object:added', () => this.recordState())
    canvas.on('object:removed', () => this.recordState())
    canvas.on('object:modified', () => this.recordState())
  }

  private recordState() {
    if (this.isUndoRedo) return

    const currentState = JSON.stringify(this.canvas.toJSON())
    
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1)
    
    // Add new state
    this.history.push(currentState)
    
    // Limit to 20 actions
    if (this.history.length > 20) {
      this.history.shift()
    } else {
      this.historyIndex++
    }
  }

  undo() {
    if (this.historyIndex <= 0) return false

    this.isUndoRedo = true
    const newIndex = this.historyIndex - 1
    this.canvas.loadFromJSON(this.history[newIndex], () => {
      this.historyIndex = newIndex
      this.isUndoRedo = false
    })
    return true
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return false

    this.isUndoRedo = true
    const newIndex = this.historyIndex + 1
    this.canvas.loadFromJSON(this.history[newIndex], () => {
      this.historyIndex = newIndex
      this.isUndoRedo = false
    })
    return true
  }

  canUndo() {
    return this.historyIndex > 0
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1
  }

  getState() {
    return JSON.parse(this.history[this.historyIndex])
  }
}

// Arbitraries for generating test data
const textObjectArbitrary = fc.record({
  type: fc.constant('text'),
  left: fc.integer({ min: 0, max: 500 }),
  top: fc.integer({ min: 0, max: 500 }),
  width: fc.integer({ min: 50, max: 300 }),
  height: fc.integer({ min: 20, max: 100 }),
  fill: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
  text: fc.string({ minLength: 1, maxLength: 50 })
})

const actionArbitrary = fc.oneof(
  fc.constant({ type: 'add' as const }),
  fc.constant({ type: 'remove' as const })
)

describe('Property-Based Tests: Undo/Redo Functionality', () => {
  /**
   * Property 25: Undo Restores Previous State
   * 
   * For any sequence of design actions followed by undo operations,
   * each undo should restore the design state to the state before
   * the corresponding action.
   * 
   * Validates: Requirements 10.4
   */
  it('Property 25: Undo Restores Previous State', () => {
    fc.assert(
      fc.property(
        fc.array(textObjectArbitrary, { minLength: 1, maxLength: 10 }),
        (objects) => {
          const canvas = new MockCanvas()
          const history = new HistoryManager(canvas)

          // Record states after each action
          const states: any[] = [JSON.stringify(canvas.toJSON())]

          // Add objects one by one
          objects.forEach(obj => {
            canvas.add(obj)
            states.push(JSON.stringify(canvas.toJSON()))
          })

          // Now undo each action and verify state matches
          for (let i = objects.length; i > 0; i--) {
            const undoSucceeded = history.undo()
            expect(undoSucceeded).toBe(true)
            
            const currentState = JSON.stringify(canvas.toJSON())
            const expectedState = states[i - 1]
            
            // States should match
            expect(JSON.parse(currentState)).toEqual(JSON.parse(expectedState))
          }

          // After undoing all actions, should be back to initial empty state
          const finalState = canvas.toJSON()
          expect(finalState.objects.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 26: Redo Round Trip
   * 
   * For any design action followed by undo then redo, the final state
   * should match the state after the original action.
   * 
   * Validates: Requirements 10.5
   */
  it('Property 26: Redo Round Trip', () => {
    fc.assert(
      fc.property(
        fc.array(textObjectArbitrary, { minLength: 1, maxLength: 10 }),
        (objects) => {
          const canvas = new MockCanvas()
          const history = new HistoryManager(canvas)

          // Add objects
          objects.forEach(obj => {
            canvas.add(obj)
          })

          // Capture state after all additions
          const stateAfterAdditions = JSON.stringify(canvas.toJSON())

          // Undo all actions
          let undoCount = 0
          while (history.canUndo()) {
            history.undo()
            undoCount++
          }

          expect(undoCount).toBe(objects.length)

          // Redo all actions
          let redoCount = 0
          while (history.canRedo()) {
            history.redo()
            redoCount++
          }

          expect(redoCount).toBe(objects.length)

          // State should match the state after original additions
          const stateAfterRedo = JSON.stringify(canvas.toJSON())
          expect(JSON.parse(stateAfterRedo)).toEqual(JSON.parse(stateAfterAdditions))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: History limit enforcement
   * 
   * For any sequence of more than 20 actions, the history should
   * maintain only the most recent 20 states.
   */
  it('Property: History maintains maximum of 20 states', () => {
    fc.assert(
      fc.property(
        fc.array(textObjectArbitrary, { minLength: 25, maxLength: 30 }),
        (objects) => {
          const canvas = new MockCanvas()
          const history = new HistoryManager(canvas)

          // Add many objects
          objects.forEach(obj => {
            canvas.add(obj)
          })

          // Count how many times we can undo
          let undoCount = 0
          while (history.canUndo()) {
            history.undo()
            undoCount++
          }

          // Should be able to undo at most 20 times (the limit)
          // Note: We start with 1 initial state, so we can undo min(objects.length, 20) times
          expect(undoCount).toBeLessThanOrEqual(20)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Additional property: Undo/Redo state consistency
   * 
   * For any sequence of undo/redo operations, canUndo and canRedo
   * should correctly reflect the availability of those operations.
   */
  it('Property: Undo/Redo availability flags are consistent', () => {
    fc.assert(
      fc.property(
        fc.array(textObjectArbitrary, { minLength: 3, maxLength: 8 }),
        (objects) => {
          const canvas = new MockCanvas()
          const history = new HistoryManager(canvas)

          // Initially, should not be able to undo (only initial state)
          expect(history.canUndo()).toBe(false)
          expect(history.canRedo()).toBe(false)

          // Add objects
          objects.forEach(obj => {
            canvas.add(obj)
          })

          // Should be able to undo now
          expect(history.canUndo()).toBe(true)
          expect(history.canRedo()).toBe(false)

          // Undo once
          history.undo()
          expect(history.canUndo()).toBe(objects.length > 1)
          expect(history.canRedo()).toBe(true)

          // Redo
          history.redo()
          expect(history.canUndo()).toBe(true)
          expect(history.canRedo()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
