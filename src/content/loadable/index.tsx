import { Master as all } from './mixin'
import { Master as project } from './project'
import { Master as storage } from './storage'
import { Master as template } from './template'
import { Master as tplobject } from './tplobject'

import { Project } from '../project'
import { Storage } from '../storage'
import { Template } from '../template'
import { TplObject } from '../tplobject'
import { mixin } from '../../dweller'

mixin(Project, all)
mixin(Project, project)

mixin(Storage, all)
mixin(Storage, storage)

mixin(Template, all)
mixin(Template, template)

mixin(TplObject, all)
mixin(TplObject, tplobject)

export {}