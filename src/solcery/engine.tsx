import { PublicKey, Account, TransactionInstruction, Connection } from "@solana/web3.js";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';
import { useConnection } from "../contexts/connection";
import { useWallet } from "../contexts/wallet";

export const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij');
export const projectPublicKey = new PublicKey("9Rp3AXZqQBFw4QiwkMPsoJC7dTpRCKnd78jBBDVUjRGK"); // TODO: context
export const projectStoragePublicKey = new PublicKey("G3w2m4GCqaswe2eQM7zakwTSvRidbiqpPwHf3wh7UfZf")

export const Insctruction = {
    test: 'test'
}


export const getAccountData = async (connection: Connection, publicKey: PublicKey) => {
    var accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo?.data
}

export async function getAccountObject(connection: Connection, accountInfo: PublicKey, classname: any, schema: Map<any, any>) {
    var accountData = await getAccountData(connection, accountInfo)
    if (accountData) {
        return deserializeUnchecked(
            schema,
            classname,
            accountData.slice(33), // TODO
        )
    }
}
