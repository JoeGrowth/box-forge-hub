import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10"
import { Resend } from "https://esm.sh/resend@4.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)
    
    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Use admin client to get user from token
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
    const { deleteType, action, confirmationCode } = body
    console.log(`Action: ${action || 'delete'}, Delete type: ${deleteType}`)

    // Handle email confirmation request for hard delete
    if (action === 'send_confirmation') {
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
        return new Response(
          JSON.stringify({ error: 'Email service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Delete any existing unused tokens for this user
      await supabaseAdmin
        .from('account_deletion_tokens')
        .delete()
        .eq('user_id', user.id)
        .is('used_at', null)

      // Store token (hashed for security)
      const encoder = new TextEncoder()
      const data = encoder.encode(code + user.id)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const { error: insertError } = await supabaseAdmin
        .from('account_deletion_tokens')
        .insert({
          user_id: user.id,
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

      // Send email with code
      const resend = new Resend(resendApiKey)
      const { error: emailError } = await resend.emails.send({
        // Use Resend's default sender domain to avoid "from" domain verification issues.
        // You can switch this back to a custom domain once it's verified in Resend.
        from: 'B4 Platform <onboarding@resend.dev>',
        to: [user.email!],
        subject: 'Account Deletion Confirmation Code',
        html: `
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
        `,
      })

      if (emailError) {
        console.error('Error sending email:', emailError)
        
        // Check if it's a Resend domain verification issue (testing mode)
        const errorMessage = emailError.message ?? String(emailError)
        if (errorMessage.includes('verify a domain') || errorMessage.includes('testing emails')) {
          // Return the code directly for testing purposes when Resend domain isn't verified
          console.log('Resend domain not verified, returning code directly for testing')
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Email service is in testing mode. Your confirmation code is: ' + code,
              testMode: true,
              code: code // Include code for development/testing
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({
            error: 'Failed to send confirmation email',
            details: errorMessage,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Confirmation email sent to:', user.email)
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
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error soft deleting profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Soft delete successful for user:', user.id)
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

      // Verify confirmation code
      const encoder = new TextEncoder()
      const data = encoder.encode(confirmationCode + user.id)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

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

      // Hard delete: completely remove user data
      console.log('Starting hard delete for user:', user.id)
      
      // Delete from all related tables
      await supabaseAdmin.from('profiles').delete().eq('user_id', user.id)
      await supabaseAdmin.from('onboarding_state').delete().eq('user_id', user.id)
      await supabaseAdmin.from('natural_roles').delete().eq('user_id', user.id)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id)
      await supabaseAdmin.from('user_notifications').delete().eq('user_id', user.id)
      await supabaseAdmin.from('admin_notifications').delete().eq('user_id', user.id)
      await supabaseAdmin.from('entrepreneur_journey_responses').delete().eq('user_id', user.id)
      await supabaseAdmin.from('startup_applications').delete().eq('applicant_id', user.id)
      await supabaseAdmin.from('startup_ideas').delete().eq('creator_id', user.id)
      await supabaseAdmin.from('account_deletion_tokens').delete().eq('user_id', user.id)

      // Finally, delete the auth user
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete auth user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Hard delete successful for user:', user.id)
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
