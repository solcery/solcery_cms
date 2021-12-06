import { Connection } from "@solana/web3.js";

let Master: any = {}

Master.await = function(connection: Connection) {
	if (!this.loadable) {
		this.load(connection)
	}
	return this.loadable
}

Master.load = function(connection: Connection) {
	if (!this.pubkey)
		throw new Error('content/loadable/mixin error - trying to load object without set pubkey')
	this.loadable = new Promise((resolve: any, reject: any) => {
		resolve(connection.getAccountInfo(this.pubkey).then((accInfo: any) => {
			if (!accInfo)
				return null;
			this.fromBinary(accInfo.data.slice(33))
			this.execAllMixins('onLoad', accInfo.data.slice(33), connection)
			return this
		}))

	});
}

Master.onCreate = function (data: any) {
	this.pubkey = data.pubkey // assert without pubkey
	this.id = data.pubkey.toBase58()
}

// Master.onLoaded = function (data: any) {
// 	this.isLoaded = true
// }

export { Master }
