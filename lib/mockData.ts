import { Table, WaitingOrder, MenuItem } from "./types";

export const initialMenu: MenuItem[] = [
  { id: "m1", name: "소세지 야채볶음", price: 8500 },
  { id: "m2", name: "김치찌개", price: 9000 },
  { id: "m3", name: "제육볶음", price: 11000 },
  { id: "m4", name: "부대찌개", price: 13000 },
  { id: "m5", name: "골뱅이무침", price: 15000 },
  { id: "m6", name: "파전", price: 12000 },
  { id: "m7", name: "계란말이", price: 7000 },
  { id: "m8", name: "공기밥", price: 1000 },
  { id: "m9", name: "소주", price: 4000 },
  { id: "m10", name: "맥주", price: 5000 },
];

const MIN = 60 * 1000;
const now = Date.now();

/** 20개 좌석 — 일부는 사용중, 일부는 빈 테이블 */
export const initialTables: Table[] = Array.from({ length: 20 }, (_, i) => {
  const number = i + 1;
  const occupied: Record<number, Table["order"]> = {
    1: { items: [{ name: "소세지 야채볶음", qty: 1, price: 8500 }, { name: "물", qty: 2, price: 0 }], startedAt: now - 4 * MIN },
    3: {
      items: [
        { name: "김치찌개", qty: 1, price: 9000 },
        { name: "계란말이", qty: 1, price: 7000 },
        { name: "소주", qty: 2, price: 4000 },
      ],
      startedAt: now - 12 * MIN,
    },
    5: { items: [{ name: "제육볶음", qty: 2, price: 11000 }, { name: "공기밥", qty: 2, price: 1000 }], startedAt: now - 63 * MIN },
    8: { items: [{ name: "골뱅이무침", qty: 1, price: 15000 }, { name: "맥주", qty: 3, price: 5000 }], startedAt: now - 25 * MIN },
    12: { items: [{ name: "부대찌개", qty: 1, price: 13000 }, { name: "라면사리", qty: 2, price: 2000 }], startedAt: now - 8 * MIN },
    15: { items: [{ name: "파전", qty: 1, price: 12000 }, { name: "막걸리", qty: 1, price: 5000 }], startedAt: now - 47 * MIN },
  };
  return { id: number, number, order: occupied[number] ?? null };
});

export const initialWaiting: WaitingOrder[] = [
  {
    id: "w1",
    type: "dine-in",
    tableNumber: 3,
    items: [
      { name: "소세지 야채볶음", qty: 1, price: 8500 },
      { name: "물", qty: 2, price: 0 },
    ],
    createdAt: now - 3 * MIN,
    stage: "received",
  },
  {
    id: "w2",
    type: "dine-in",
    tableNumber: 12,
    items: [
      { name: "부대찌개", qty: 1, price: 13000 },
      { name: "라면사리", qty: 2, price: 2000 },
    ],
    createdAt: now - 9 * MIN,
    stage: "preparing",
  },
  {
    id: "t1",
    type: "takeout",
    orderNo: "P-1043",
    pickupAt: now + 15 * MIN,
    items: [
      { name: "제육볶음 도시락", qty: 2, price: 9000 },
      { name: "김치", qty: 1, price: 0 },
    ],
    createdAt: now - 2 * MIN,
    stage: "received",
  },
  {
    id: "t2",
    type: "takeout",
    orderNo: "P-1042",
    pickupAt: now + 5 * MIN,
    items: [{ name: "파전", qty: 1, price: 12000 }],
    createdAt: now - 11 * MIN,
    stage: "preparing",
  },
];

/** 신규 주문 시뮬레이션용 샘플 풀 */
export const sampleNewOrders: Omit<WaitingOrder, "id" | "createdAt" | "isNew">[] = [
  {
    type: "dine-in",
    tableNumber: 7,
    items: [
      { name: "김치찌개", qty: 1, price: 9000 },
      { name: "공기밥", qty: 1, price: 1000 },
    ],
    stage: "received",
  },
  {
    type: "takeout",
    orderNo: "P-1044",
    pickupAt: Date.now() + 20 * MIN,
    items: [{ name: "골뱅이무침", qty: 1, price: 15000 }],
    stage: "received",
  },
  {
    type: "dine-in",
    tableNumber: 18,
    items: [
      { name: "계란말이", qty: 1, price: 7000 },
      { name: "맥주", qty: 2, price: 5000 },
    ],
    stage: "received",
  },
];
