class SolceryTypesCollection {
	types = new Map<number, any>();
	constructor() {}
	get = (id: number) => {
		let type = this.types.get(id)
		if (!type)
			throw new Error('Attempt to get type with unknown ID');
		return type
	}
	add(id: number, type: any) {
		this.types.set(id, type)
	}
	keys() {
		return this.types.keys()
	}
}

export const solceryTypes = new Map<number, any>()

export const solceryTypesNew = new SolceryTypesCollection()