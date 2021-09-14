import { PublicKey, Account, TransactionInstruction, Connection } from "@solana/web3.js";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';

export const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij');
// export const projectPublicKey = new PublicKey("9Rp3AXZqQBFw4QiwkMPsoJC7dTpRCKnd78jBBDVUjRGK"); // TODO: context
// export const projectStoragePublicKey = new PublicKey("G3w2m4GCqaswe2eQM7zakwTSvRidbiqpPwHf3wh7UfZf")

export const projectPublicKey = new PublicKey("Mmw8kXJm19XrKd34ue8wD1atEXDeV8sNG2PdcSPcDCh"); // TODO: context
export const projectStoragePublicKey = new PublicKey("6TVGtAPMTaYsWm7eGJhaURYMR9LHamihmowV3vUcVgMw")

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
            console.log(accountInfos[i]!.data)
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