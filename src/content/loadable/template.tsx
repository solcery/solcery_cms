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
  src.storages.forEach((storagePubkey: PublicKey) => {
    this.create(Storage, {
      id: storagePubkey.toBase58(),
      pubkey: storagePubkey,
      storedClass: TplObject,
    })
  })
}

Master.loadAll = function(connection: Connection) {
  this.getAll(Storage).forEach((storage: any) => {
    storage.load(connection).then((storage: any) => {
      storage.loadAll(connection)
    })
  })
}

Master.onCreate = function() {
  this.parent.parent.templates[this.pubkey] = this
}

export { Master }