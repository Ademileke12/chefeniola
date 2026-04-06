import { NextRequest, NextResponse } from 'next/server'
import { fileService } from '@/lib/services/fileService'
import { requireAdmin } from '@/lib/auth'
import { validateCSRF } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    // CSRF Protection
    if (!validateCSRF(request)) {
      return NextResponse.json(
        { error: 'Forbidden: CSRF validation failed' },
        { status: 403 }
      )
    }

    // Security check
    const { isAdmin } = await requireAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a file.' },
        { status: 400 }
      )
    }

    // Validate file is actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      )
    }

    // Security: Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Security: Validate file type (whitelist)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, SVG, PDF.' },
        { status: 400 }
      )
    }

    // Security: Validate file extension
    const fileName = file.name.toLowerCase()
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.pdf']
    const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx', '.jsp', '.js', '.vbs', '.scr', '.com', '.pif']
    
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => fileName.endsWith(ext))
    
    if (!hasAllowedExtension || hasDangerousExtension) {
      return NextResponse.json(
        { error: 'Invalid file extension. Dangerous file types are not allowed.' },
        { status: 400 }
      )
    }

    // Upload file using file service
    try {
      const url = await fileService.uploadDesign(file)

      return NextResponse.json({
        url,
        filename: file.name,
        size: file.size,
        type: file.type,
      })
    } catch (uploadError) {
      console.error('Upload error details:', uploadError)

      // Handle validation errors
      if (uploadError instanceof Error) {
        console.error('Error message:', uploadError.message)
        console.error('Error stack:', uploadError.stack)

        if (uploadError.message.includes('File validation failed')) {
          return NextResponse.json(
            {
              error: 'File validation failed',
              details: uploadError.message.split(': ')[1]
            },
            { status: 400 }
          )
        }

        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
          return NextResponse.json(
            {
              error: 'Storage bucket not configured',
              details: uploadError.message
            },
            { status: 500 }
          )
        }

        if (uploadError.message.includes('File upload failed')) {
          return NextResponse.json(
            {
              error: 'Failed to upload file to storage',
              details: uploadError.message
            },
            { status: 500 }
          )
        }

        // Return the actual error message for debugging
        return NextResponse.json(
          {
            error: 'Upload failed',
            details: uploadError.message
          },
          { status: 500 }
        )
      }

      throw uploadError
    }

  } catch (error) {
    console.error('Error uploading file:', error)

    // Handle form data parsing errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to parse')) {
        return NextResponse.json(
          { error: 'Invalid request format. Expected multipart/form-data.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
