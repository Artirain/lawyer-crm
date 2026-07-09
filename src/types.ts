export type Status = 'Новый' | 'В работе' | 'Закрыт'

export const STATUSES: Status[] = ['Новый', 'В работе', 'Закрыт']

export interface Client {
  id: string
  name: string
  phone: string
  status: Status
  created_at: string
}
