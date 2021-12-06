import { Dweller, mixin } from '../../dweller'
import { Master as project } from './project'

export const Project: any = {
	classname: 'Project',
}

Object.setPrototypeOf(Project, Dweller)
mixin(Project, project)
