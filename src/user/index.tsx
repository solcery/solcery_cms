import { Dweller } from '../dweller'

const User: any = {}

User.userMethod = function () {
	console.log('userMethod for ' + this.id)
}

Object.setPrototypeOf(User, Dweller)

export { User }