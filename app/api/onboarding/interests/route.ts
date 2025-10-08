import { NextRequest } from 'next/server';
import { updateInterests } from '@/backend/controllers/onboarding.controller';

export async function PUT(req: NextRequest) {
  return updateInterests(req);
}

