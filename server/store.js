import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialGifts, previousGiftImages } from './catalog.js';
import legacyGifts from './legacy-catalog.json' with { type: 'json' };

export const digest = (value) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export class StoreError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function createStore(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK(price_cents > 0), category TEXT NOT NULL,
      image_url TEXT NOT NULL, badge TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, gift_id TEXT NOT NULL REFERENCES gifts(id), gift_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, guest_name TEXT NOT NULL, email TEXT NOT NULL,
      message TEXT NOT NULL, method TEXT NOT NULL CHECK(method IN ('pix','card')),
      mode TEXT NOT NULL CHECK(mode IN ('demo','live')), status TEXT NOT NULL DEFAULT 'pending',
      idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
      access_hash TEXT NOT NULL, hook_hash TEXT NOT NULL, checkout_url TEXT,
      transaction_nsu TEXT UNIQUE, invoice_slug TEXT, actual_method TEXT,
      created_at TEXT NOT NULL, confirmed_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gift_reservation ON orders(gift_id, mode)
      WHERE status IN ('pending','confirmed','demo_confirmed');
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY);
  `);
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE name=?').get('visual-catalog-2026-11-02')) {
    const columns=['name','description','price_cents','category','image_url','badge','active','sort_order'];
    const stmt = db.prepare('INSERT OR IGNORE INTO gifts (id,name,description,price_cents,category,image_url,badge,active,sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
    db.exec('BEGIN IMMEDIATE');
    try {
      // Update only untouched starter gifts. Keep custom edits, existing IDs and order snapshots.
      for(const previous of legacyGifts){
        const current=db.prepare('SELECT * FROM gifts WHERE id=?').get(previous.id);
        if(!current||!columns.every(key=>current[key]===previous[key]))continue;
        const next=initialGifts.find(g=>g.id===previous.id);
        if(next)db.prepare(`UPDATE gifts SET ${columns.map(k=>`${k}=?`).join(',')} WHERE id=?`).run(...columns.map(k=>next[k]),previous.id);
        else db.prepare('UPDATE gifts SET active=0 WHERE id=?').run(previous.id);
      }
      for (const gift of initialGifts) stmt.run(...Object.values(gift));
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('visual-catalog-2026-11-02');
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE name=?').get('gift-meme-images-2026-11-02')) {
    db.exec('BEGIN IMMEDIATE');
    try {
      for(const [id,previous] of Object.entries(previousGiftImages)){
        const next=initialGifts.find(g=>g.id===id);
        db.prepare('UPDATE gifts SET image_url=? WHERE id=? AND image_url=?').run(next.image_url,id,`/gifts/${previous}`);
      }
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run('gift-meme-images-2026-11-02');
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  const order = (id) => db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  return {
    db,
    close: () => db.close(),
    order,
    catalog(mode) {
      return db.prepare(`SELECT g.*, CASE WHEN EXISTS (SELECT 1 FROM orders o WHERE o.gift_id=g.id
        AND o.mode=? AND o.status IN ('pending','confirmed','demo_confirmed')) THEN 0 ELSE 1 END AS available
        FROM gifts g WHERE g.active=1 ORDER BY g.sort_order, g.id`).all(mode);
    },
    reserve(data, mode, key, guestToken, hookToken) {
      const requestHash = digest(JSON.stringify(data));
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = db.prepare('SELECT * FROM orders WHERE idempotency_key=?').get(key);
        if (previous) {
          if (previous.request_hash !== requestHash || previous.access_hash !== digest(guestToken) || previous.mode !== mode) {
            throw new StoreError('Esta solicitação já foi utilizada. Reabra o presente e tente novamente.', 409);
          }
          db.exec('COMMIT'); return { order: previous, repeated: true };
        }
        const gift = db.prepare('SELECT * FROM gifts WHERE id=? AND active=1').get(data.giftId);
        if (!gift) throw new StoreError('Este presente não está mais disponível.', 404);
        const occupied = db.prepare("SELECT id FROM orders WHERE gift_id=? AND mode=? AND status IN ('pending','confirmed','demo_confirmed')").get(gift.id, mode);
        if (occupied) throw new StoreError('Este presente acabou de ser reservado. Escolha outro carinho para os noivos.', 409);
        const id = randomUUID();
        db.prepare(`INSERT INTO orders (id,gift_id,gift_name,amount_cents,guest_name,email,message,method,mode,
          idempotency_key,request_hash,access_hash,hook_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(id,gift.id,gift.name,gift.price_cents,data.name,data.email,data.message,data.method,mode,
            key,requestHash,digest(guestToken),digest(hookToken),new Date().toISOString());
        db.exec('COMMIT'); return { order: order(id), repeated: false };
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    setCheckout(id, url) { db.prepare('UPDATE orders SET checkout_url=? WHERE id=?').run(url, id); },
    confirm(id, payment) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const current = order(id);
        if (!current) throw new StoreError('Pedido não encontrado.', 404);
        if (current.status === 'confirmed') { db.exec('COMMIT'); return current; }
        if (current.mode !== 'live' || current.status !== 'pending' || payment.paid !== true || payment.success !== true || payment.amount !== current.amount_cents) {
          throw new StoreError('O pagamento ainda não foi validado pelo provedor.', 422);
        }
        db.prepare("UPDATE orders SET status='confirmed', confirmed_at=?, transaction_nsu=?, invoice_slug=?, actual_method=? WHERE id=?")
          .run(new Date().toISOString(),payment.transaction_nsu,payment.slug,payment.capture_method || 'unknown',id);
        db.exec('COMMIT'); return order(id);
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    demoConfirm(id) {
      const current = order(id);
      if (!current || current.mode !== 'demo') throw new StoreError('Simulação indisponível.', 400);
      db.prepare("UPDATE orders SET status='demo_confirmed', confirmed_at=? WHERE id=? AND status='pending'").run(new Date().toISOString(), id);
      return order(id);
    },
    cancelDemo(id) {
      db.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND mode='demo' AND status='pending'").run(id);
    },
    admin() {
      const orders = db.prepare('SELECT id,gift_id,gift_name,amount_cents,guest_name,email,message,method,mode,status,created_at,confirmed_at,actual_method FROM orders ORDER BY created_at DESC').all();
      const confirmed = orders.filter(o => o.status === 'confirmed' && o.mode === 'live');
      return {
        orders, gifts: db.prepare('SELECT * FROM gifts ORDER BY sort_order,id').all(),
        totals: { received: confirmed.reduce((n,o) => n+o.amount_cents, 0), confirmed: confirmed.length,
          pending: orders.filter(o => o.mode === 'live' && o.status === 'pending').length,
          simulations: orders.filter(o => o.status === 'demo_confirmed').length },
      };
    },
    saveGift(id, data) {
      if (id) {
        if (!db.prepare('SELECT id FROM gifts WHERE id=?').get(id)) throw new StoreError('Presente não encontrado.', 404);
        db.prepare('UPDATE gifts SET name=?,description=?,price_cents=?,category=?,image_url=?,badge=?,active=? WHERE id=?')
          .run(data.name,data.description,data.price_cents,data.category,data.image_url,data.badge,data.active ? 1 : 0,id);
      } else {
        id = randomUUID();
        db.prepare('INSERT INTO gifts (id,name,description,price_cents,category,image_url,badge) VALUES (?,?,?,?,?,?,?)')
          .run(id,data.name,data.description,data.price_cents,data.category,data.image_url,data.badge);
      }
      return db.prepare('SELECT * FROM gifts WHERE id=?').get(id);
    },
    resetDemo() { db.prepare("UPDATE orders SET status='cancelled' WHERE mode='demo' AND status IN ('pending','demo_confirmed')").run(); },
  };
}
