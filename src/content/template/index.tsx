import { Dweller, mixin } from '../../dweller'

import { Master as template } from './template'

const Template: any = {
	classname: 'Template',
}

Object.setPrototypeOf(Template, Dweller)
mixin(Template, template)

export { Template }