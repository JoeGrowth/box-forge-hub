import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10"
import { Resend } from "https://esm.sh/resend@4.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashCode(code: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendConfirmationEmail(
  resend: any,
  email: string,
  code: string,
  isAdminDeletion: boolean,
  targetUserName?: string
): Promise<{ error?: any }> {
  const subject = isAdminDeletion 
    ? `Admin Account Deletion Confirmation - ${targetUserName || 'User'}`
    : 'Account Deletion Confirmation Code'
  
  const html = isAdminDeletion
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Admin Account Deletion Request</h1>
        <p>You requested to permanently delete the account for user: <strong>${targetUserName || 'Unknown'}</strong></p>
        <p>Your confirmation code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">This code expires in 15 minutes.</p>
        <p style="color: #dc2626; font-weight: bold;">Warning: This action is irreversible. All user data will be permanently deleted.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Account Deletion Request</h1>
        <p>You requested to permanently delete your B4 Platform account.</p>
        <p>Your confirmation code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">This code expires in 15 minutes.</p>
        <p style="color: #dc2626; font-weight: bold;">Warning: This action is irreversible. All your data will be permanently deleted.</p>
        <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email and your account will remain safe.</p>
      </div>
    `

  return await resend.emails.send({
    from: 'B4 Platform <onboarding@resend.dev>',
    to: [email],
    subject,
    html,
  })
}

async function deleteUserData(supabaseAdmin: any, targetUserId: string): Promise<void> {
  console.log('Deleting user data for:', targetUserId)
  
  await supabaseAdmin.from('profiles').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('onboarding_state').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('natural_roles').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('user_notifications').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('admin_notifications').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('entrepreneur_journey_responses').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('startup_applications').delete().eq('applicant_id', targetUserId)
  await supabaseAdmin.from('startup_ideas').delete().eq('creator_id', targetUserId)
  await supabaseAdmin.from('account_deletion_tokens').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('learning_journeys').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('journey_phase_responses').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('idea_journey_progress').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('user_certifications').delete().eq('user_id', targetUserId)
  await supabaseAdmin.from('startup_team_members').delete().eq('member_user_id', targetUserId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Error getting user:', userError?.message || 'No user found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, user.email)

    const body = await req.json()
    const { deleteType, action, confirmationCode, targetUserId, isAdminAction } = body
    console.log(`Action: ${action || 'delete'}, Delete type: ${deleteType}, Admin action: ${isAdminAction}`)

    // Verify admin privileges for admin actions
    if (isAdminAction) {
      const { data: adminRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (roleError || !adminRole) {
        console.error('User is not an admin')
        return new Response(
          JSON.stringify({ error: 'Unauthorized - admin privileges required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Admin privileges verified for user:', user.id)
    }

    // Determine the target user (self or another user for admin)
    const effectiveTargetUserId = isAdminAction && targetUserId ? targetUserId : user.id
    const emailRecipient = user.email! // Always send to the acting user (admin or self)

    // Handle email confirmation request
    if (action === 'send_confirmation') {
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get target user's name for admin deletion email
      let targetUserName = ''
      if (isAdminAction && targetUserId) {
        const { data: targetProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', targetUserId)
          .maybeSingle()
        targetUserName = targetProfile?.full_name || 'Unknown User'
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      // Delete any existing unused tokens for this action
      // For admin: use admin's user_id but store target_user_id reference
      await supabaseAdmin
        .from('account_deletion_tokens')
        .delete()
        .eq('user_id', user.id)
        .is('used_at', null)

      // Store token hash
      const tokenHash = await hashCode(code, user.id)

      const { error: insertError } = await supabaseAdmin
        .from('account_deletion_tokens')
        .insert({
          user_id: user.id, // The person performing the action (admin or self)
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString()
        })

      if (insertError) {
        console.error('Error storing token:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate confirmation code' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send email
      const resend = new Resend(resendApiKey)
      const { error: emailError } = await sendConfirmationEmail(
        resend,
        emailRecipient,
        code,
        !!isAdminAction,
        targetUserName
      )

      if (emailError) {
        console.error('Error sending email:', emailError)
        const errorMessage = emailError.message ?? String(emailError)
        
        if (errorMessage.includes('verify a domain') || errorMessage.includes('testing emails')) {
          console.log('Resend domain not verified, returning code directly for testing')
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Email service is in testing mode. Your confirmation code is: ' + code,
              testMode: true,
              code: code
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to send confirmation email', details: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Confirmation email sent to:', emailRecipient)
      return new Response(
        JSON.stringify({ success: true, message: 'Confirmation code sent to your email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle soft delete
    if (deleteType === 'soft') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('user_id', effectiveTargetUserId)

      if (updateError) {
        console.error('Error soft deleting profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Soft delete successful for user:', effectiveTargetUserId)
      return new Response(
        JSON.stringify({ success: true, message: 'Account deactivated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle hard delete with confirmation code
    if (deleteType === 'hard') {
      if (!confirmationCode) {
        return new Response(
          JSON.stringify({ error: 'Confirmation code required for permanent deletion' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify confirmation code (using acting user's ID for hash)
      const tokenHash = await hashCode(confirmationCode, user.id)

      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('account_deletion_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (tokenError || !tokenData) {
        console.error('Invalid or expired confirmation code')
        return new Response(
          JSON.stringify({ error: 'Invalid or expired confirmation code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark token as used
      await supabaseAdmin
        .from('account_deletion_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id)

      // Delete user data
      console.log('Starting hard delete for user:', effectiveTargetUserId)
      await deleteUserData(supabaseAdmin, effectiveTargetUserId)

      // Delete the auth user
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(effectiveTargetUserId)
      
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete auth user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Hard delete successful for user:', effectiveTargetUserId)
      return new Response(
        JSON.stringify({ success: true, message: 'Account permanently deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Use deleteType "soft" or "hard"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-account function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
