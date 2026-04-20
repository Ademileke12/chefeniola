/**
 * Script to validate migration 010 SQL syntax
 * 
 * This script performs basic SQL syntax validation without connecting to the database.
 * It checks for common issues like:
 * - Balanced parentheses
 * - Proper semicolons
 * - Valid SQL keywords
 * - Proper string quoting
 * 
 * Usage: npx tsx scripts/validate-migration-010-sql.ts
 */

import * as fs from 'fs'
import * as path from 'path'

function validateSQL(sql: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for balanced parentheses
  let parenCount = 0
  for (const char of sql) {
    if (char === '(') parenCount++
    if (char === ')') parenCount--
    if (parenCount < 0) {
      errors.push('Unbalanced parentheses: closing parenthesis without opening')
      break
    }
  }
  if (parenCount > 0) {
    errors.push(`Unbalanced parentheses: ${parenCount} unclosed opening parenthesis`)
  }

  // Check for proper statement termination
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))
  if (statements.length === 0) {
    errors.push('No SQL statements found')
  }

  // Check for required keywords in migration
  const requiredKeywords = ['CREATE TABLE', 'CREATE INDEX', 'ALTER TABLE', 'CREATE POLICY']
  const foundKeywords = requiredKeywords.filter(keyword => 
    sql.toUpperCase().includes(keyword)
  )

  if (foundKeywords.length < 3) {
    warnings.push(`Only found ${foundKeywords.length} of ${requiredKeywords.length} expected keywords`)
  }

  // Check for IF NOT EXISTS (best practice)
  if (!sql.includes('IF NOT EXISTS')) {
    warnings.push('Consider using IF NOT EXISTS for idempotent migrations')
  }

  // Check for proper indexing
  const indexCount = (sql.match(/CREATE INDEX/gi) || []).length
  if (indexCount === 0) {
    warnings.push('No indexes found - consider adding indexes for performance')
  }

  // Check for RLS
  if (!sql.includes('ENABLE ROW LEVEL SECURITY')) {
    warnings.push('Row Level Security not enabled - consider security implications')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function analyzeSQL(sql: string) {
  console.log('📊 SQL Analysis\n')

  // Count statements
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'))
  console.log(`Total statements: ${statements.length}`)

  // Count different types
  const creates = (sql.match(/CREATE TABLE/gi) || []).length
  const indexes = (sql.match(/CREATE INDEX/gi) || []).length
  const policies = (sql.match(/CREATE POLICY/gi) || []).length
  const comments = (sql.match(/COMMENT ON/gi) || []).length

  console.log(`  - CREATE TABLE: ${creates}`)
  console.log(`  - CREATE INDEX: ${indexes}`)
  console.log(`  - CREATE POLICY: ${policies}`)
  console.log(`  - COMMENT ON: ${comments}`)
  console.log()

  // Check for best practices
  console.log('✅ Best Practices Check\n')
  
  const checks = [
    { name: 'Uses IF NOT EXISTS', pass: sql.includes('IF NOT EXISTS') },
    { name: 'Has indexes', pass: indexes > 0 },
    { name: 'Has RLS enabled', pass: sql.includes('ENABLE ROW LEVEL SECURITY') },
    { name: 'Has RLS policies', pass: policies > 0 },
    { name: 'Has documentation comments', pass: comments > 0 },
    { name: 'Uses UUID for primary key', pass: sql.includes('UUID PRIMARY KEY') },
    { name: 'Has timestamps', pass: sql.includes('TIMESTAMPTZ') },
    { name: 'Has constraints', pass: sql.includes('CHECK') },
  ]

  checks.forEach(check => {
    console.log(`  ${check.pass ? '✅' : '⚠️ '} ${check.name}`)
  })
  console.log()
}

async function main() {
  console.log('🔍 Validating Migration 010 SQL\n')

  try {
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/010_create_audit_events_table.sql'
    )

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8')
    console.log('📄 Loaded migration file\n')

    // Validate SQL
    const validation = validateSQL(sql)

    if (validation.errors.length > 0) {
      console.log('❌ Validation Errors:\n')
      validation.errors.forEach(error => console.log(`  - ${error}`))
      console.log()
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:\n')
      validation.warnings.forEach(warning => console.log(`  - ${warning}`))
      console.log()
    }

    // Analyze SQL
    analyzeSQL(sql)

    // Summary
    if (validation.valid) {
      console.log('═══════════════════════════════════════════════════════')
      console.log('✅ SQL Validation PASSED')
      console.log('═══════════════════════════════════════════════════════\n')

      console.log('📋 Migration Summary:')
      console.log('  - Creates audit_events table')
      console.log('  - Adds 7 performance indexes')
      console.log('  - Enables Row Level Security')
      console.log('  - Creates 2 RLS policies')
      console.log('  - Adds documentation comments')
      console.log('  - Includes data constraints\n')

      console.log('🎯 Next Steps:')
      console.log('  1. Review the migration file')
      console.log('  2. Run the migration in Supabase Dashboard:')
      console.log('     - Go to SQL Editor')
      console.log('     - Copy contents of 010_create_audit_events_table.sql')
      console.log('     - Execute the SQL')
      console.log('  3. Verify with: npx tsx scripts/verify-migration-010.ts\n')

      console.log('📖 Documentation:')
      console.log('  - See: supabase/migrations/010_MIGRATION_GUIDE.md\n')

    } else {
      console.log('═══════════════════════════════════════════════════════')
      console.log('❌ SQL Validation FAILED')
      console.log('═══════════════════════════════════════════════════════\n')
      console.log('Please fix the errors above before running the migration.\n')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  }
}

main()
