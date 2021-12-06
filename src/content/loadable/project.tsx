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

Master.onLoad = function(data: any, connection: Connection) {
	// if (!this.templateStorage)
	// 	throw new Error("content/loadable/project: onLoad error: no templateStorage!")
	// this.templateStorage.load(connection).then(() => {
 //    	this.templateStorage.loadAll(connection).then(() => {
 //    		console.log('loadAll')
 //    	})
	// })
}

export { Master }