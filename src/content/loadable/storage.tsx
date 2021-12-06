import { deserializeUnchecked } from 'borsh';
import { PublicKey, Connection } from "@solana/web3.js";
import { schema, StorageData } from './schema'

let Master: any = {}

Master.fromBinary = function(data: any) {
  let src = deserializeUnchecked(schema, StorageData, data)
  this.templatePubkey = src.templatePubkey
  this.accounts = src.accounts
  this.accounts.forEach((pubkey: PublicKey) => {
    this.create(this.storedClass, {
      id: pubkey.toBase58(),
      pubkey: pubkey
    })
  })
}

Master.loadAll = function(connection: Connection) { //TODO Promise
  if (!this.storedClass)
    return;
  let objects = this.getAll(this.storedClass)
  let toLoad = objects.filter((obj: any) => !obj.isLoaded);
  let pubkeys = toLoad.map((obj: any) => new PublicKey(obj.id))
  return connection.getMultipleAccountsInfo(pubkeys).then((accInfos: any) => {
    for (let i = 0; i < accInfos.length; i++) {
      let accInfo = accInfos[i]
      if (accInfo !== null) {
        toLoad[i].fromBinary(accInfo.data.slice(33))
      }
    }
  })
}


export { Master }