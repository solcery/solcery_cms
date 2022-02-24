import { Connection } from "@solana/web3.js";
import { Project } from '../project'

let Master: any = {}

Master.await = function(connection: Connection) {
	if (!this.loadable && this.load) {
		this.loadable = this.load(connection)
	}
	return this.loadable
}

Master.load = async function(connection: Connection, data: any) {
  if (!this.pubkey)
    throw new Error('content/loadable/mixin error - trying to load object without set pubkey')
  if (!data) {
		let accInfo = await connection.getAccountInfo(this.pubkey)
		if (!accInfo)
			throw new Error('content/loadable/mixin error - account data error')
	  data = accInfo.data.slice(33)
  }
  this.fromBinary(data)
  await this.awaitAllMixins('onLoad', connection)
  this.isLoaded = true
  if (!this.loadableSubscription) 
  	this.loadableSubscription = connection.onAccountChange(this.pubkey, 
  		(accInfo) => this.load(connection, accInfo.data.slice(33))
  	);
  return this
}

Master.onCreate = function (data: any) {
	this.pubkey = data.pubkey // assert without pubkey
	this.id = data.pubkey.toBase58()

	let project = this.root.getAll(Project)[0] // TODO ??
	project.childrenById[this.id] = this
	this.project = project
}

export { Master }
