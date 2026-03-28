'use client'

interface DesignToolbarProps {
  onAddText: () => void
  onAddImage: () => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isUploading?: boolean
}

export default function DesignToolbar({
  onAddText,
  onAddImage,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection,
  isUploading = false
}: DesignToolbarProps) {
  return (
    <div className="flex gap-2 items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Element creation tools */}
      <div className="flex gap-2">
        <button
          onClick={onAddText}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          type="button"
          title="Add Text Element"
        >
          Add Text
        </button>
        <button
          onClick={onAddImage}
          disabled={isUploading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          type="button"
          title="Add Image Element"
        >
          {isUploading ? 'Uploading...' : 'Add Image'}
        </button>
      </div>

      {/* Divider */}
      <div className="border-l border-gray-300 h-8 mx-2"></div>

      {/* History controls */}
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 font-medium"
          type="button"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 font-medium"
          type="button"
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>

      {/* Divider */}
      <div className="border-l border-gray-300 h-8 mx-2"></div>

      {/* Element actions */}
      <div className="flex gap-2">
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 font-medium"
          type="button"
          title="Delete Element (Delete / Backspace)"
        >
          Delete
        </button>
      </div>

      {/* Selection indicator */}
      {hasSelection && (
        <div className="ml-auto">
          <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 font-medium">
            Element selected
          </span>
        </div>
      )}
    </div>
  )
}
