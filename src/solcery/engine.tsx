import { PublicKey, Account, TransactionInstruction, Connection } from "@solana/web3.js";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';

export const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij');
// export const projectPublicKey = new PublicKey("9Rp3AXZqQBFw4QiwkMPsoJC7dTpRCKnd78jBBDVUjRGK"); // TODO: context
// export const projectStoragePublicKey = new PublicKey("G3w2m4GCqaswe2eQM7zakwTSvRidbiqpPwHf3wh7UfZf")

export const projectPublicKey = new PublicKey("C2AHyArAZxGSSBSW6e3MaNbfU9qeUQ9gWLcNmpYwBuhL"); // TODO: context
export const projectStoragePublicKey = new PublicKey("4oH9JFLX4aCVyWvGU68VEuXRkKdzWWypCjQtHakBnFp1")

export const getAccountData = async (connection: Connection, publicKey: PublicKey) => {
    var accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo?.data
}

export const getMultipleAccountsData = async (connection: Connection, publicKeys: PublicKey[]) => {
    var result = []
    var accountInfos = await connection.getMultipleAccountsInfo(publicKeys);
    for (let accountInfo of accountInfos) {
        if (accountInfo)
            result.push(accountInfo.data)
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
    for (let accountData of accountDatas) {
        result.push(deserializeUnchecked(
            schema,
            classname,
            accountData.slice(33), // TODO
        ))
    }
    return result
}