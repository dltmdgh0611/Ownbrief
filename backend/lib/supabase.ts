import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

// Get Supabase client (lazy initialization)
function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured in environment variables')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

/**
 * Upload audio file to Supabase Storage
 * @param buffer Audio buffer
 * @param fileName File name (e.g., 'podcast-xxx.wav')
 * @param mimeType MIME type (e.g., 'audio/wav')
 * @returns Public URL of uploaded file
 */
export async function uploadAudioToStorage(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  console.log(`📤 Uploading to Supabase Storage: ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`)
  
  try {
    const supabase = getSupabaseClient()
    
    // Upload to 'podcasts' bucket
    const { data, error } = await supabase.storage
      .from('podcasts')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      })

    if (error) {
      console.error('❌ Supabase Storage upload error:', error)
      throw error
    }

    console.log('✅ Upload successful:', data.path)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('podcasts')
      .getPublicUrl(fileName)

    console.log('🔗 Public URL:', publicUrl)
    
    return publicUrl
  } catch (error: any) {
    console.error('❌ Upload to Supabase Storage failed:', error)
    throw new Error(`Failed to upload audio file: ${error.message}`)
  }
}

/**
 * Delete audio file from Supabase Storage
 * @param fileName File name to delete
 */
export async function deleteAudioFromStorage(fileName: string): Promise<void> {
  console.log(`🗑️ Deleting from Supabase Storage: ${fileName}`)
  
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase.storage
      .from('podcasts')
      .remove([fileName])

    if (error) {
      console.error('❌ Supabase Storage delete error:', error)
      throw error
    }

    console.log('✅ Delete successful')
  } catch (error: any) {
    console.error('❌ Delete from Supabase Storage failed:', error)
    // Don't throw error for delete failures
  }
}
