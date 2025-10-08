import { NextRequest } from 'next/server';
import { completeOnboarding } from '@/backend/controllers/onboarding.controller';

export async function POST(req: NextRequest) {
  return completeOnboarding(req);
}

