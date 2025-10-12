import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { UserService } from '@/backend/services/user.service'

/**
 * 사용자 설정 가져오기
 */
export async function getUserSettings() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    console.log('🔍 사용자 설정 가져오기:', session.user.email)

    const userSettings = await UserService.getUserSettings(session.user.email)
    const isAdmin = await UserService.isAdmin(session.user.email)

    const settings = {
      selectedPlaylists: userSettings?.selectedPlaylists || [],
      interests: userSettings?.interests || [],
      deliveryTimeHour: userSettings?.deliveryTimeHour ?? 8,
      deliveryTimeMinute: userSettings?.deliveryTimeMinute ?? 0,
      lastDeliveryTimeUpdate: userSettings?.lastDeliveryTimeUpdate || null,
      isAdmin
    }

    console.log('✅ 사용자 설정 가져오기 완료:', settings)

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('❌ 사용자 설정 가져오기 오류:', error)
    return NextResponse.json(
      { error: '사용자 설정을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 사용자 설정 저장
 */
export async function saveUserSettings(
  selectedPlaylists: string[], 
  interests?: string[],
  deliveryTimeHour?: number,
  deliveryTimeMinute?: number
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    console.log('💾 사용자 설정 저장:', {
      userEmail: session.user.email,
      selectedPlaylists,
      interests,
      deliveryTimeHour,
      deliveryTimeMinute
    })

    // 기본 설정 저장 (플레이리스트, 관심사)
    const userSettings = await UserService.saveUserSettings(
      session.user.email,
      selectedPlaylists,
      interests,
      undefined, // deliveryTime은 별도로 처리
      undefined
    )

    // 배달 시간 변경이 있는 경우 별도 처리 (하루 1회 제한 체크)
    if (deliveryTimeHour !== undefined && deliveryTimeMinute !== undefined) {
      await UserService.updateDeliveryTime(
        session.user.email,
        deliveryTimeHour,
        deliveryTimeMinute
      )
    }

    // 최신 설정 다시 가져오기
    const updatedSettings = await UserService.getUserSettings(session.user.email)

    const settings = {
      selectedPlaylists: updatedSettings?.selectedPlaylists || [],
      interests: updatedSettings?.interests || [],
      deliveryTimeHour: updatedSettings?.deliveryTimeHour ?? 8,
      deliveryTimeMinute: updatedSettings?.deliveryTimeMinute ?? 0
    }

    console.log('✅ 사용자 설정 저장 완료:', settings)

    return NextResponse.json({ 
      success: true, 
      message: '설정이 저장되었습니다.',
      settings 
    })

  } catch (error: any) {
    console.error('❌ 사용자 설정 저장 오류:', error)
    return NextResponse.json(
      { error: error.message || '사용자 설정 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 사용자 계정 삭제
 */
export async function deleteUserAccount() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    await UserService.deleteUser(session.user.email)

    return NextResponse.json({
      success: true,
      message: '계정이 삭제되었습니다.'
    })

  } catch (error) {
    console.error('계정 삭제 오류:', error)
    return NextResponse.json(
      { error: '계정 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
