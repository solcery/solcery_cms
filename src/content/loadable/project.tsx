import { deserializeUnchecked } from 'borsh';
import { Connection } from "@solana/web3.js";
import { schema, ProjectData } from './schema'
import { Storage } from '../storage'
import { Template } from '../template'

let Master: any = {}

Master.fromBinary = function(data: any) {
	let src = deserializeUnchecked(schema, ProjectData, data)
	this.name = src.name
	this.owner = src.owner
	this.templateStorage = this.create(Storage, { 
		id: src.tplStoragePubkey.toBase58(),
		pubkey: src.tplStoragePubkey,
    	storedClass: Template,
	})
}

Master.onLoad = async function(connection: Connection) {
  await this.templateStorage.load(connection)
  await this.templateStorage.loadAll(connection)
}

export { Master }
