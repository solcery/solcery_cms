import { Dweller, mixin } from '../../dweller'
import { Master as storage } from './storage'

export const Storage: any = {
	classname: 'Storage',
}

Object.setPrototypeOf(Storage, Dweller)
mixin(Storage, storage)
