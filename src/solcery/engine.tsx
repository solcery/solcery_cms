import { PublicKey, Account, TransactionInstruction, Connection } from "@solana/web3.js";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';
import { Storage, TplObject, TemplateData } from './classes';

export const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij');

export const projectPublicKey = new PublicKey("Mmw8kXJm19XrKd34ue8wD1atEXDeV8sNG2PdcSPcDCh"); // TODO: context
export const projectStoragePublicKey = new PublicKey("6TVGtAPMTaYsWm7eGJhaURYMR9LHamihmowV3vUcVgMw")

// export const projectPublicKey = new PublicKey("FXYwtW93jsCHfQiwNixKAZytD3jk4dMJqC1znfdB5w9a"); // Teuzet
// export const projectStoragePublicKey = new PublicKey("2M81Zhp2udWntHHZ5bH4nyUCrPf6S6FqefcJJaPoqz9w")

export const getAccountData = async (connection: Connection, publicKey: PublicKey) => {
    var accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo?.data
}

export const getMultipleAccountsData = async (connection: Connection, publicKeys: PublicKey[]) => {
    var result = []
    var accountInfos = await connection.getMultipleAccountsInfo(publicKeys);
    for (let i in accountInfos) {
        if (accountInfos[i])
            result.push([publicKeys[i], accountInfos[i]!.data])
    }
    return result
}

export async function getAccountObject(connection: Connection, publicKey: PublicKey, classname: any, schema: Map<any, any>) {
    var accountData = await getAccountData(connection, publicKey)
    if (accountData) {
        return deserializeUnchecked(
            schema,
            classname,
            accountData.slice(33), // TODO
        )
    }
}

export async function getAllAccountObjects(connection: Connection, publicKeys: PublicKey[], classname: any, schema: Map<any, any>) {
    var accountDatas = await getMultipleAccountsData(connection, publicKeys)
    var result = []
    var accountInfos = await connection.getMultipleAccountsInfo(publicKeys);
    for (let i in accountInfos) {
        if (accountInfos[i]) {
            var res = deserializeUnchecked(
                schema,
                classname,
                accountInfos[i]!.data.slice(33), // TODO
            )
            res.publicKey = publicKeys[i]
            result.push(res)
        }
    }
    return result
}

export async function construct(connection: Connection) {
    let result: Map<number, any> = new Map()
    const projectStorage = await Storage.get(connection, projectStoragePublicKey)
    var templates = await TemplateData.getAll(connection, projectStorage.accounts)
    templates.forEach(async (tpl: TemplateData) => {
        var constructed = await tpl.construct(connection)
        console.log(tpl.id)
        console.log(constructed)
        result.set(tpl.id, constructed)  
    })
    return await Object.fromEntries(await result)
}