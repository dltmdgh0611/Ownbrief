/**
 * Podcast API Endpoint
 * GET /api/podcast - Fetch podcast list
 */
import { NextRequest } from 'next/server'
import { getPodcasts } from '@/backend/controllers/podcast.controller'

export async function GET(request: NextRequest) {
  return getPodcasts()
}