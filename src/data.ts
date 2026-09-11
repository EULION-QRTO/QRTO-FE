import { assetUrl } from './lib/config'
import type { MenuResponse, MenuBoardResponse } from './lib/dto'

export type Product = {
  id: string
  name: string
  price: number
  description: string
  /** 서버가 imageUrl 을 안 내려주면 undefined — 이때는 사진 없이 표시한다(플레이스홀더 없음). */
  image: string | undefined
  soldOut: boolean
}

export type TabKey = 'menu' | 'etc'

export function toProduct(m: MenuResponse): Product {
  return {
    id: String(m.id),
    name: m.name,
    price: m.price,
    description: m.description ?? '',
    image: assetUrl(m.imageUrl),
    soldOut: m.soldOut,
  }
}

/**
 * 메뉴판(카테고리별)을 손님앱 2탭 구조(메뉴/기타)로 나눈다.
 * - '메뉴' 탭: 카테고리명이 '메뉴'인 그룹(없으면 sortOrder 가장 앞 그룹)
 * - '기타' 탭: 나머지 카테고리의 메뉴 전체
 */
export function splitMenuBoard(board: MenuBoardResponse): { menu: Product[]; etc: Product[] } {
  const cats = [...board.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const menuCat = cats.find((c) => c.categoryName === '메뉴') ?? cats[0]
  const menu: Product[] = []
  const etc: Product[] = []
  for (const c of cats) {
    const target = c === menuCat ? menu : etc
    for (const m of c.menus) target.push(toProduct(m))
  }
  return { menu, etc }
}
