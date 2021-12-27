import { Master as project } from './project'
import { Master as template } from './template'
import { Master as tplobject } from './tplobject'

import { Project } from '../project'
import { Template } from '../template'
import { TplObject } from '../tplobject'

import { mixin } from '../../dweller'

mixin(Project, project)
mixin(Template, template)
mixin(TplObject, tplobject)


export {}
