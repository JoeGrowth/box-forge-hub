import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Use admin client to get user from token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { deleteType } = await req.json()
    console.log(`Processing ${deleteType} delete for user:`, user.id)

    if (deleteType === 'soft') {
      // Soft delete: mark account as deleted
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
          JSON.stringify({ error: 'Failed to soft delete account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Soft delete successful for user:', user.id)
      return new Response(
        JSON.stringify({ success: true, message: 'Account deactivated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (deleteType === 'hard') {
      // Hard delete: completely remove user
      // Delete related data first (cascade should handle most, but being explicit)
      
      // Delete from profiles
      await supabaseAdmin.from('profiles').delete().eq('user_id', user.id)
      
      // Delete from onboarding_state
      await supabaseAdmin.from('onboarding_state').delete().eq('user_id', user.id)
      
      // Delete from natural_roles
      await supabaseAdmin.from('natural_roles').delete().eq('user_id', user.id)
      
      // Delete from user_roles
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id)
      
      // Delete from user_notifications
      await supabaseAdmin.from('user_notifications').delete().eq('user_id', user.id)
      
      // Delete from admin_notifications
      await supabaseAdmin.from('admin_notifications').delete().eq('user_id', user.id)
      
      // Delete from entrepreneur_journey_responses
      await supabaseAdmin.from('entrepreneur_journey_responses').delete().eq('user_id', user.id)

      // Delete startup applications by user
      await supabaseAdmin.from('startup_applications').delete().eq('applicant_id', user.id)

      // Delete startup ideas by user
      await supabaseAdmin.from('startup_ideas').delete().eq('creator_id', user.id)

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

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid delete type. Use "soft" or "hard"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in delete-account function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
