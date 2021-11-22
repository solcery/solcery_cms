import { Master as user } from './user'
import { Master as dweller } from './dweller'
import { User } from '../user'
import { mixin, Dweller } from '../dweller'

mixin(User, user)
mixin(Dweller, dweller)
