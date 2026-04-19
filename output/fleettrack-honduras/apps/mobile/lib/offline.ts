import * as SQLite from 'expo-sqlite'
import { supabase } from './supabase'

const db = SQLite.openDatabaseSync('fleettrack_offline.db')

// Initialize offline storage tables
export function initOfflineDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0
    );
  `)
}

export const offlineQueue = {
  async add(type: string, payload: object) {
    db.runSync(
      'INSERT INTO offline_queue (type, payload, created_at) VALUES (?, ?, ?)',
      [type, JSON.stringify(payload), new Date().toISOString()]
    )
  },

  async getAll() {
    return db.getAllSync<{ id: number; type: string; payload: string }>(
      'SELECT * FROM offline_queue ORDER BY created_at ASC LIMIT 100'
    )
  },

  async remove(id: number) {
    db.runSync('DELETE FROM offline_queue WHERE id = ?', [id])
  },

  async sync() {
    const items = await this.getAll()
    if (items.length === 0) return

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload)
        let error: unknown = null

        if (item.type === 'location') {
          const result = await supabase.from('locations').insert(payload)
          error = result.error
        } else if (item.type === 'delivery_update') {
          const { id, ...data } = payload
          const result = await supabase.from('deliveries').update(data).eq('id', id)
          error = result.error
        } else if (item.type === 'incident') {
          const result = await supabase.from('incidents').insert(payload)
          error = result.error
        } else if (item.type === 'photo') {
          const result = await supabase.from('delivery_photos').insert(payload)
          error = result.error
        }

        if (!error) {
          await this.remove(item.id)
        }
      } catch {
        // Keep item in queue for next sync
      }
    }
  },
}
