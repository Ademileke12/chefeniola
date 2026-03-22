import { supabaseAdmin } from '@/lib/supabase/server'
import { DatabaseSupportTicket } from '@/types/database'

export type CreateSupportTicketData = Pick<DatabaseSupportTicket, 'customer_email' | 'customer_name' | 'subject' | 'message'>

export const supportService = {
    /**
     * Create a new support ticket
     */
    async createTicket(data: CreateSupportTicketData): Promise<DatabaseSupportTicket> {
        const { data: ticket, error } = await supabaseAdmin
            .from('support_tickets')
            .insert({
                ...data,
                status: 'open',
            })
            .select()
            .single()

        if (error) {
            console.error('[supportService] Create ticket error:', error)
            throw new Error(`Failed to create support ticket: ${error.message}`)
        }

        return ticket
    },

    /**
     * Get all support tickets (admin)
     */
    async getAllTickets(): Promise<DatabaseSupportTicket[]> {
        const { data: tickets, error } = await supabaseAdmin
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[supportService] Get tickets error:', error)
            throw new Error(`Failed to fetch support tickets: ${error.message}`)
        }

        return tickets || []
    },

    /**
     * Update a support ticket (admin)
     */
    async updateTicket(id: string, updates: Partial<DatabaseSupportTicket>): Promise<DatabaseSupportTicket> {
        const { data: ticket, error } = await supabaseAdmin
            .from('support_tickets')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[supportService] Update ticket error:', error)
            throw new Error(`Failed to update support ticket: ${error.message}`)
        }

        return ticket
    },

    /**
     * Delete a support ticket (admin)
     */
    async deleteTicket(id: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('support_tickets')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[supportService] Delete ticket error:', error)
            throw new Error(`Failed to delete support ticket: ${error.message}`)
        }
    }
}
