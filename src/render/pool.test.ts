import { test, expect } from 'vitest'
import { ObjectPool } from './pool'

test('acquire creates on demand; release recycles the same instance', () => {
  let created = 0
  const pool = new ObjectPool(() => ({ id: ++created }))
  const a = pool.acquire()
  pool.acquire()
  expect(pool.created).toBe(2)
  pool.release(a)
  expect(pool.idleCount).toBe(1)
  expect(pool.acquire()).toBe(a) // reused, not a fresh allocation
  expect(pool.created).toBe(2)
})

test('reset runs on release', () => {
  const pool = new ObjectPool<{ v: number }>(
    () => ({ v: 1 }),
    (o) => {
      o.v = 0
    },
  )
  const o = pool.acquire()
  o.v = 99
  pool.release(o)
  expect(o.v).toBe(0)
})

test('prewarm fills the pool; maxIdle caps retention', () => {
  const pool = new ObjectPool(() => ({}), undefined, { prewarm: 3, maxIdle: 1 })
  expect(pool.idleCount).toBe(3)
  expect(pool.created).toBe(3)
  const items = [pool.acquire(), pool.acquire(), pool.acquire()]
  expect(pool.idleCount).toBe(0)
  for (const it of items) pool.release(it)
  expect(pool.idleCount).toBe(1) // extras dropped past the cap
})
