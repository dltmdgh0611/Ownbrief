/**
 * User Settings API Endpoint
 * GET /api/user/settings - Fetch user settings
 * POST /api/user/settings - Save user settings
 */
import { getUserSettings, saveUserSettings } from '@/backend/controllers/user.controller'

export async function GET() {
  return getUserSettings()
}

export async function POST(request: Request) {
  const { selectedPlaylists, interests, deliveryTimeHour, deliveryTimeMinute } = await request.json()
  return saveUserSettings(selectedPlaylists, interests, deliveryTimeHour, deliveryTimeMinute)
}