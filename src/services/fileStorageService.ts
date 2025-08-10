import { supabaseServer } from '@/lib/supabase/server'
import { supabase } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export interface FileMetadata {
  name: string
  size: number
  type: string
  userId: string
  isPublic?: boolean
}

export class FileStorageService {
  private static instance: FileStorageService
  
  // Storage buckets
  private readonly ANIMATION_BUCKET = 'animation-data'
  private readonly SHEET_MUSIC_BUCKET = 'sheet-music-files'
  private readonly TEMP_BUCKET = 'temp-uploads'

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService()
    }
    return FileStorageService.instance
  }

  /**
   * Upload animation data to storage
   */
  async uploadAnimationData(
    data: any,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      console.log('🔄 Starting animation data upload...')
      console.log('Metadata received:', {
        name: metadata.name,
        userId: metadata.userId,
        size: metadata.size,
        type: metadata.type,
        isPublic: metadata.isPublic
      })

      const fileName = this.generateFileName(metadata.name, metadata.userId, 'animation')
      const filePath = `${metadata.userId}/${fileName}`
      
      console.log('📁 Generated file path:', filePath)
      console.log('📂 Target bucket:', this.ANIMATION_BUCKET)
      
      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2)
      const buffer = Buffer.from(jsonData, 'utf-8')
      
      console.log('📊 Data stats:', {
        jsonLength: jsonData.length,
        bufferLength: buffer.length,
        dataKeys: Object.keys(data || {}),
        hasNotes: Array.isArray(data?.notes),
        notesCount: Array.isArray(data?.notes) ? data.notes.length : 'N/A'
      })

      console.log('⬆️ Attempting upload to Supabase...')
      const { data: uploadData, error } = await supabaseServer.storage
        .from(this.ANIMATION_BUCKET)
        .upload(filePath, buffer, {
          contentType: 'application/json',
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Animation data upload error:', error)
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error
        })
        return { success: false, error: error.message }
      }

      console.log('✅ Upload successful! Upload data:', uploadData)

      // Get public URL if public
      const { data: { publicUrl } } = supabaseServer.storage
        .from(this.ANIMATION_BUCKET)
        .getPublicUrl(filePath)

      console.log('🔗 Generated public URL:', publicUrl)

      // Verify file exists by checking if we can access it
      try {
        console.log('🔍 Verifying file upload...')
        const { data: files, error: listError } = await supabaseServer.storage
          .from(this.ANIMATION_BUCKET)
          .list(metadata.userId)

        if (listError) {
          console.warn('⚠️ Could not verify file upload:', listError.message)
        } else {
          const uploadedFile = files?.find(f => f.name === fileName)
          if (uploadedFile) {
            console.log('✅ File verification successful:', {
              name: uploadedFile.name,
              size: uploadedFile.metadata?.size,
              lastModified: uploadedFile.updated_at
            })
          } else {
            console.warn('⚠️ File not found in listing after upload')
          }
        }
      } catch (verifyError) {
        console.warn('⚠️ File verification failed:', verifyError)
      }

      return {
        success: true,
        url: publicUrl,
        path: filePath
      }

    } catch (error) {
      console.error('💥 Upload animation data error:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  /**
   * Upload sheet music file to storage
   */
  async uploadSheetMusicFile(
    fileBuffer: Buffer,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      const fileName = this.generateFileName(metadata.name, metadata.userId, 'sheet')
      const filePath = `${metadata.userId}/${fileName}`

      const { data: uploadData, error } = await supabaseServer.storage
        .from(this.SHEET_MUSIC_BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: metadata.type,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Sheet music upload error:', error)
        return { success: false, error: error.message }
      }

      // Get public URL for public files
      const url = metadata.isPublic ? 
        this.getPublicUrl(this.SHEET_MUSIC_BUCKET, filePath) :
        this.getSignedUrl(this.SHEET_MUSIC_BUCKET, filePath, 3600) // 1 hour for private

      return {
        success: true,
        url: await url,
        path: filePath
      }

    } catch (error) {
      console.error('Upload sheet music error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  /**
   * Upload temporary file
   */
  async uploadTempFile(
    fileBuffer: Buffer,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      const fileName = this.generateFileName(metadata.name, metadata.userId, 'temp')
      const filePath = `${metadata.userId}/${Date.now()}_${fileName}`

      const { data: uploadData, error } = await supabaseServer.storage
        .from(this.TEMP_BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: metadata.type,
          cacheControl: '300', // 5 minutes cache for temp files
          upsert: true
        })

      if (error) {
        console.error('Temp file upload error:', error)
        return { success: false, error: error.message }
      }

      const url = await this.getSignedUrl(this.TEMP_BUCKET, filePath, 3600) // 1 hour

      return {
        success: true,
        url,
        path: filePath
      }

    } catch (error) {
      console.error('Upload temp file error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  /**
   * Download file from storage
   */
  async downloadFile(bucket: string, filePath: string): Promise<Buffer | null> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .download(filePath)

      if (error) {
        console.error('Download error:', error)
        return null
      }

      return Buffer.from(await data.arrayBuffer())

    } catch (error) {
      console.error('Download file error:', error)
      return null
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.error('Delete file error:', error)
        return false
      }

      return true

    } catch (error) {
      console.error('Delete file error:', error)
      return false
    }
  }

  /**
   * Delete multiple files from storage
   */
  async deleteFiles(bucket: string, filePaths: string[]): Promise<{
    success: string[]
    failed: string[]
  }> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .remove(filePaths)

      if (error) {
        console.error('Bulk delete error:', error)
        return { success: [], failed: filePaths }
      }

      const successPaths = data?.map(d => d.name) || []
      const failedPaths = filePaths.filter(path => !successPaths.includes(path))

      return {
        success: successPaths,
        failed: failedPaths
      }

    } catch (error) {
      console.error('Delete files error:', error)
      return { success: [], failed: filePaths }
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, filePath: string): string {
    const { data } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        console.error('Signed URL error:', error)
        throw new Error('Failed to create signed URL')
      }

      return data.signedUrl

    } catch (error) {
      console.error('Get signed URL error:', error)
      throw error
    }
  }

  /**
   * List files in a bucket path
   */
  async listFiles(bucket: string, path: string = ''): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .list(path)

      if (error) {
        console.error('List files error:', error)
        return []
      }

      return data || []

    } catch (error) {
      console.error('List files error:', error)
      return []
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(bucket: string, filePath: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .list('', {
          limit: 1,
          search: filePath
        })

      if (error || !data || data.length === 0) {
        return null
      }

      return data[0]

    } catch (error) {
      console.error('Get file info error:', error)
      return null
    }
  }

  /**
   * Clean up old temp files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<{
    deleted: number
    errors: string[]
  }> {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)
      const files = await this.listFiles(this.TEMP_BUCKET)
      
      const oldFiles = files.filter(file => {
        const fileTime = new Date(file.created_at).getTime()
        return fileTime < cutoffTime
      })

      if (oldFiles.length === 0) {
        return { deleted: 0, errors: [] }
      }

      const filePaths = oldFiles.map(file => file.name)
      const result = await this.deleteFiles(this.TEMP_BUCKET, filePaths)

      return {
        deleted: result.success.length,
        errors: result.failed
      }

    } catch (error) {
      console.error('Cleanup temp files error:', error)
      return { deleted: 0, errors: ['Cleanup failed'] }
    }
  }

  /**
   * Generate unique file name
   */
  private generateFileName(originalName: string, userId: string, prefix: string): string {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    
    return `${prefix}_${timestamp}_${randomStr}.${extension}`
  }

  /**
   * Initialize storage buckets (for setup)
   */
  async initializeBuckets(): Promise<boolean> {
    try {
      const buckets = [
        { name: this.ANIMATION_BUCKET, public: true },
        { name: this.SHEET_MUSIC_BUCKET, public: true },
        { name: this.TEMP_BUCKET, public: false }
      ]

      for (const bucket of buckets) {
        const { error } = await supabaseServer.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: bucket.name === this.ANIMATION_BUCKET ? 
            ['application/json'] : 
            ['application/pdf', 'image/png', 'image/jpeg'],
          fileSizeLimit: bucket.name === this.TEMP_BUCKET ? 
            50 * 1024 * 1024 : // 50MB for temp files
            10 * 1024 * 1024   // 10MB for others
        })

        if (error && !error.message.includes('already exists')) {
          console.error(`Failed to create bucket ${bucket.name}:`, error)
          return false
        }
      }

      return true

    } catch (error) {
      console.error('Initialize buckets error:', error)
      return false
    }
  }
}

// Export singleton instance
export const fileStorageService = FileStorageService.getInstance()