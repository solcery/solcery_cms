import { Master as all } from './mixin'

import { Project } from '../content/project'
import { Storage } from '../content/storage'
import { Template } from '../content/template'
import { mixin } from '../dweller'

mixin(Project, all)

mixin(Storage, all)

mixin(Template, all)

export {}