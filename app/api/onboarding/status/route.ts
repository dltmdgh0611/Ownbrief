import { NextRequest } from 'next/server';
import { getOnboardingStatus } from '@/backend/controllers/onboarding.controller';

export async function GET(req: NextRequest) {
  return getOnboardingStatus(req);
}

