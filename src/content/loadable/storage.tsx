import { deserializeUnchecked } from 'borsh';
import { PublicKey, Connection } from "@solana/web3.js";
import { schema, StorageData } from './schema'

let Master: any = {
  reloadOnUpdate: true,
}

Master.fromBinary = function(data: any) {
  let src = deserializeUnchecked(schema, StorageData, data)
  this.templatePubkey = src.templatePubkey
  src.accounts.forEach((pubkey: PublicKey) => {
    this.create(this.storedClass, {
      id: pubkey.toBase58(),
      pubkey: pubkey
    })
  })
}

Master.loadAll = async function(connection: Connection) { //TODO Promise
  if (!this.storedClass)
    return;
  let objects = this.getAll(this.storedClass) 

  let toLoad = objects.filter((obj: any) => !obj.isLoaded);
  let pubkeys = toLoad.map((obj: any) => new PublicKey(obj.id))
  let accInfos = await connection.getMultipleAccountsInfo(pubkeys)
  let items: any[] = [];
  for (let i = 0; i < accInfos.length; i++) {
    let accInfo = accInfos[i]
    if (accInfo !== null) {
      items.push(toLoad[i].load(connection, accInfo.data.slice(33)))
    }
  }
  await Promise.all(items)
  this.execAllMixins('onStorageFullyLoaded')
}

Master.onSolanaAccountChanged = async function (connection: Connection, data: any) {
  this.objects[this.storedClass.classname] = {}
  await this.load(connection, data)
  this.loadAll(connection)
}

export { Master }
