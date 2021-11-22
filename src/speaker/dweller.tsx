let Master: any = {}

Master.onStart = function () {
	console.log('Dweller/Speaker/onStart')
}

Master.onCreate = function () {
	console.log('Dweller/Speaker/onCreate')
}

export { Master }