import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, gelato_product_uid, variants')
    .limit(3)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Products with variants:')
  data.forEach(p => {
    console.log('\nProduct:', p.name)
    console.log('Base UID:', p.gelato_product_uid)
    console.log('Variants:', JSON.stringify(p.variants, null, 2))
  })
}

checkProducts()
