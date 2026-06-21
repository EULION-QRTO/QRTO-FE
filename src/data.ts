import food from './assets/food.png'
import staffCall from './assets/staff-call.png'
import water from './assets/water.png'
import spoon from './assets/spoon.png'

export type Product = {
  id: string
  name: string
  price: number
  description: string
  image: string
}

export type TabKey = 'menu' | 'etc'

const SAUSAGE_DESCRIPTION =
  '맛있는 소세지와 양파, 파프리카 등 각종 채소들로 건강하면서 맛있는 소세지 야채볶음.'

export const MENU_ITEMS: Product[] = Array.from({ length: 5 }, (_, i) => ({
  id: `m${i + 1}`,
  name: '소세지 야채볶음',
  price: 8500,
  description: SAUSAGE_DESCRIPTION,
  image: food,
}))

export const ETC_ITEMS: Product[] = [
  {
    id: 'e1',
    name: '직원 호출',
    price: 0,
    description: '팁 주세요.',
    image: staffCall,
  },
  {
    id: 'e2',
    name: '물',
    price: 0,
    description: '신선하고 깨끗한 탄천에서 건져올린 금붕어가 든 물. 개수 늘려서 추가 가능.',
    image: water,
  },
  {
    id: 'e3',
    name: '수저',
    price: 0,
    description: '자작나무를 자작자작 태우며 만든 공장 나무젓가락. 개수 늘려서 추가 가능.',
    image: spoon,
  },
]

export const ALL_ITEMS: Product[] = [...MENU_ITEMS, ...ETC_ITEMS]
