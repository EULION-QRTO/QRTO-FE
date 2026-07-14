/**
 * 주점(매장) 계정 — 데모용 목업 "DB".
 * 실제 서비스에서는 DB + 해시된 비밀번호(bcrypt 등)로 대체.
 * storeId 는 각 주점 POS의 식별자(서브도메인/경로)로 사용된다.
 */
export interface StoreAccount {
  storeId: string;
  username: string;
  password: string;
  storeName: string;
}

export const accounts: StoreAccount[] = [
  { storeId: "euljiro", username: "euljiro", password: "1234", storeName: "을지로 본점" },
  { storeId: "hongdae", username: "hongdae", password: "1234", storeName: "홍대점" },
  { storeId: "gangnam", username: "gangnam", password: "1234", storeName: "강남점" },
];

export const findAccount = (username: string, password: string): StoreAccount | undefined =>
  accounts.find((a) => a.username === username && a.password === password);

export const findStore = (storeId: string): StoreAccount | undefined =>
  accounts.find((a) => a.storeId === storeId);
