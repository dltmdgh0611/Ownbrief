import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const dynamic = 'force-dynamic'

const SURVEY_OPTIONS = new Set(['mail', 'calendar', 'slack', 'notion', 'trend'])

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        userSettings: {
          select: {
            surveyPreferredBriefing: true,
            surveyFeedback: true,
            surveySubmittedAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.userSettings) {
      return NextResponse.json({ survey: null })
    }

    return NextResponse.json({
      survey: {
        preferredBriefing: user.userSettings.surveyPreferredBriefing,
        feedback: user.userSettings.surveyFeedback,
        submittedAt: user.userSettings.surveySubmittedAt,
      },
    })
  } catch (error) {
    console.error('Failed to fetch survey response:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey response' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { preferredBriefing, feedback } = await request.json()

    if (typeof preferredBriefing !== 'string' || !SURVEY_OPTIONS.has(preferredBriefing)) {
      return NextResponse.json({ error: 'Invalid briefing selection' }, { status: 400 })
    }

    const trimmedFeedback = typeof feedback === 'string' ? feedback.trim() : ''

    if (!trimmedFeedback) {
      return NextResponse.json({ error: 'Feedback is required' }, { status: 400 })
    }

    if (trimmedFeedback.length > 1000) {
      return NextResponse.json(
        { error: 'Feedback must be 1000 characters or less' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const submittedAt = new Date()

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        surveyPreferredBriefing: preferredBriefing,
        surveyFeedback: trimmedFeedback,
        surveySubmittedAt: submittedAt,
      },
      update: {
        surveyPreferredBriefing: preferredBriefing,
        surveyFeedback: trimmedFeedback,
        surveySubmittedAt: submittedAt,
      },
      select: {
        surveyPreferredBriefing: true,
        surveyFeedback: true,
        surveySubmittedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      survey: {
        preferredBriefing: updatedSettings.surveyPreferredBriefing,
        feedback: updatedSettings.surveyFeedback,
        submittedAt: updatedSettings.surveySubmittedAt,
      },
    })
  } catch (error: any) {
    console.error('Failed to submit survey response:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to submit survey response' },
      { status: 500 },
    )
  }
}

