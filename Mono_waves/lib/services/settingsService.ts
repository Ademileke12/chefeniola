import { supabaseAdmin } from '@/lib/supabase/server'
import { DatabaseStoreSettings } from '@/types/database'

export const settingsService = {
    /**
     * Get all store settings
     */
    async getAllSettings(): Promise<Record<string, any>> {
        const { data: settings, error } = await supabaseAdmin
            .from('store_settings')
            .select('key, value')

        if (error) {
            console.error('[settingsService] Get settings error:', error)
            return {}
        }

        // Transform array to key-value object
        return settings.reduce((acc: Record<string, any>, curr: { key: string, value: any }) => ({
            ...acc,
            [curr.key]: curr.value
        }), {})
    },

    /**
     * Get a specific setting by key
     */
    async getSetting<T>(key: string, defaultValue: T): Promise<T> {
        const { data: setting, error } = await supabaseAdmin
            .from('store_settings')
            .select('value')
            .eq('key', key)
            .maybeSingle()

        if (error || !setting) {
            return defaultValue
        }

        return setting.value as T
    },

    /**
     * Update or create a setting
     */
    async updateSetting(key: string, value: any): Promise<void> {
        // Check if setting exists
        const { data: existing } = await supabaseAdmin
            .from('store_settings')
            .select('id')
            .eq('key', key)
            .maybeSingle()

        if (existing) {
            const { error } = await supabaseAdmin
                .from('store_settings')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('key', key)

            if (error) throw new Error(`Failed to update setting ${key}: ${error.message}`)
        } else {
            const { error } = await supabaseAdmin
                .from('store_settings')
                .insert({ key, value })

            if (error) throw new Error(`Failed to create setting ${key}: ${error.message}`)
        }
    },

    /**
     * Bulk update settings
     */
    async updateSettings(settings: Record<string, any>): Promise<void> {
        const promises = Object.entries(settings).map(([key, value]) =>
            this.updateSetting(key, value)
        )
        await Promise.all(promises)
    }
}
