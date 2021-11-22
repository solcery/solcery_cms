let Master: any = {}

Master.saying = 'I am the user'

Master.speak = function () {
	console.log(this.id + ' speaks: ' + this.saying)
}

Master.onStart = function () {
	console.log('User/Speaker/onStart')
}

Master.onCreate = function (data: any) {
	console.log(data)
	this.saying = data.saying || this.saying
	console.log('User/Speaker/onCreate')
}

Master.onSmth = function (arg1: number, arg2: number) {
	console.log('User/Speaker/onSmth')
	console.log(arg1)
	console.log(arg2)
}

export { Master }