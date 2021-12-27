import { Template } from '../template'

let Master: any = {}

Master.onCreate = function (data: any) {
	this.childrenById = {}
	this.templates = {}
}

Master.getTemplate = function(id: string) {
	if (!this.templateStorage || !this.templateStorage.isLoaded)
		return {}
	return this.templateStorage.get(Template, id)
}

export { Master }
