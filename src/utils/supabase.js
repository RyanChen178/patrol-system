import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ujvqkpcbjlylresyvifa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqdnFrcGNiamx5bHJlc3l2aWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDM0MjgsImV4cCI6MjA4NTMxOTQyOH0.Xq3hfglbGcET-6axlp_dXpi3ts0zcSH9wSWszBwIaZY'

export const supabase = createClient(supabaseUrl, supabaseKey)
