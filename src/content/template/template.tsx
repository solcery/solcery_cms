import { Storage } from '../storage'
import { TplObject } from '../tplobject'

let Master: any = {}

Master.getObjects = function () {
	return this.storage.getAll(TplObject)
}

Master.getObject = function (objectId: any) {
	return this.storage.get(TplObject, objectId)
}


export { Master }
