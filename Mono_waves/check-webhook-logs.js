const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkWebhookLogs() {
  console.log('Checking webhook logs...\n')
  
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${logs?.length || 0} webhook logs\n`)
  
  logs?.forEach((log, index) => {
    console.log(`\n=== Webhook ${index + 1} ===`)
    console.log(`Source: ${log.source}`)
    console.log(`Event Type: ${log.event_type}`)
    console.log(`Processed: ${log.processed}`)
    console.log(`Error: ${log.error || 'None'}`)
    console.log(`Created: ${log.created_at}`)
    if (log.error) {
      console.log(`\nError Details: ${log.error}`)
    }
  })
}

checkWebhookLogs().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
