/**
 * User Account Delete API Endpoint
 * DELETE /api/user/delete - Delete user account
 */
import { deleteUserAccount } from '@/backend/controllers/user.controller'

export async function DELETE() {
  return deleteUserAccount()
}