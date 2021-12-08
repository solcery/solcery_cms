import { deserializeUnchecked } from 'borsh';
import { PublicKey, Connection } from "@solana/web3.js";
import { schema, TemplateData } from './schema';
import { Storage } from '../storage';
import { TplObject } from '../tplobject';

let Master: any = {}

Master.fromBinary = function(data: any) {
  let src = deserializeUnchecked(schema, TemplateData, data)
  this.name = src.name;
  this.code = src.code;
  this.fields = {}
  src.fields.forEach((fieldData: any) => {
    this.fields[fieldData.id] = fieldData
  })
  this.maxFieldIndex = src.maxFieldIndex;
  this.customData = src.customData;
  let storagePubkey = src.storages[0] //TODO: multiple storages
  this.storage = this.create(Storage, {
    id: src.storages[0].toBase58(),
    pubkey: src.storages[0],
    storedClass: TplObject,
  })
}

Master.onLoad = async function(connection: Connection) {
  console.log('template onLoad')
  await this.storage.load(connection)
  await this.storage.loadAll(connection)
}

Master.onCreate = function() {
  this.parent.parent.templates[this.pubkey] = this
}

export { Master }