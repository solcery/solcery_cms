import { Storage } from '../storage'
import { TplObject } from '../tplobject'

let Master: any = {}

Master.getObjects = function (data: any) {
	let result: any[] = []
	result = result.concat(this.getAll(Storage).map((storage: any) => {
		storage.getAll(TplObject)
	}))
	return result
}

export { Master }
