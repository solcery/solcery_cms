import React, { useCallback } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import { AccountLayout, MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';

import axios from "axios";

import { Button, Input  } from "antd";

export async function onWalletConnected() {
  

}

declare module "borsh" {
  interface BinaryReader {
    readPubkey(): PublicKey;
  }

  interface BinaryWriter {
    writePubkey(value: PublicKey): void;
  }
}


const deserializeTplObject = async (reader: BinaryReader, template: TemplateData) => {
  var result = new Map()
  var fieldId = reader.readU32();
  while (fieldId > 0) {
    console.log(fieldId)
    var field = template.getField(fieldId)
    if (field === undefined)
      throw new Error("Error deserializing tpl Object")
    if (field.fieldType == 1) {
      result.set(field.id, reader.readU32());
    }
    if (field.fieldType == 2) {
      result.set(field.id, reader.readString());
    }
    console.log(result)
    var fieldId = reader.readU32();
  }
  var ret = Object.fromEntries(result)
  console.log(ret)
  return ret;
}

class Project {
  templates: TemplateData[] = []
  constructor( src : { templates: TemplateData[] } | undefined = undefined) {
    if (src) {
      this.templates = src.templates
    }
  }
}

class Storage {
  accounts: PublicKey[] = [];
  constructor (src: { accounts: PublicKey[] } | undefined = undefined) {
    if (src) {
      this.accounts = src.accounts;
    }
  }
}

const StorageSchema = new Map([
  [Storage, { kind: 'struct', fields: [
    ['accounts', [ 'pubkey' ]]
  ]}]
]);



class TemplateData {
  name = "Template name";
  fields: TemplateField[] = [];
  storage: PublicKey | null = null;
  maxFieldIndex: number = 0;
  constructor(src: { name : string, maxFieldIndex: number, storage: PublicKey, fields: TemplateField[] } | undefined = undefined) {
    if (src) {
      this.storage = src.storage;
      this.maxFieldIndex = src.maxFieldIndex
      this.name = src.name;
      this.fields = src.fields;
    }
  }

  getField(fieldId: number) {
    for (let field of this.fields) {
      if (field.id == fieldId)
        return field;
    }
  }
}

class Template extends TemplateData {
  publicKey: PublicKey | null = null;
}

class TemplateField {
  id = 0;
  fieldType = 0;
  name = "Field name";
  constructor(src: { id: number, fieldType: number, name: string } | undefined = undefined) {
    if (src) {
      this.id = src.id;
      this.fieldType = src.fieldType;
      this.name = src.name;
    }
  }
}


const TemplateSchema = new Map()
TemplateSchema.set(TemplateData, { kind: 'struct', fields: [
    ['name', 'string'],
    ['storage', 'pubkey'],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateField ]],
]});
TemplateSchema.set(TemplateField, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['fieldType', 'u8'],
    ['name', 'string'],
]});


export const HomeView = () => {


  (BinaryReader.prototype).readPubkey = function readPubkey() {
    const reader = this;
    const array = reader.readFixedArray(32);
    console.log(array)
    return new PublicKey(array);
  };

  (BinaryWriter.prototype).writePubkey = function writePubkey(value: PublicKey) {
    const writer = this;
    writer.writeFixedArray(value.toBuffer());
  };

  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij')
  const projectStorage = new PublicKey('CcRxfCCrQPxUaVSzopJt5NgcmSfdJV2dyzTroofgqhxy')
  const metaplexAccount = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  const systemProgramAccount = new PublicKey("11111111111111111111111111111111");
  const sysvarRentAccount = new PublicKey("SysvarRent111111111111111111111111111111111");


  const manual = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }


    var tokenProgramId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    );

    var apeLink = (document.getElementById('apeLink') as HTMLInputElement).value;


    console.log(apeLink)
    var yourUrl = "https://arweave.net/" + apeLink;

    
    const response = await axios.get(yourUrl);
    var data = response.data
    console.log(data.name)

    var b1: Buffer = Buffer.from([0x04, 0x00, 0x00, 0x00, 0x44, 0x41, 0x50, 0x45, 0x3f, 0x00, 0x00, 0x00]);
    var apeBuffer = Buffer.concat([
      Buffer.from([0x00, 0x0f, 0x00, 0x00, 0x00]),
      Buffer.from(data.name, "utf8"),
      b1,
      Buffer.from("https://arweave.net/" + apeLink, "utf8"),
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
    ])

    console.log(apeBuffer.toString('hex'))

    var accounts = [];
    var instructions = []

    var apeMintAccount = new Account();
    accounts.push(apeMintAccount);


    var createMintAccountIx = SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      space: 82, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(82, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: apeMintAccount.publicKey,
    });
    instructions.push(createMintAccountIx)

    var createMintIx = Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      apeMintAccount.publicKey,
      0,
      publicKey,
      publicKey,
    );
    instructions.push(createMintIx);

    var associatedAccountPublicKey = await Token.getAssociatedTokenAddress(
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      tokenProgramId,
      apeMintAccount.publicKey,
      publicKey,
    );

    // metaplex
    // metaplexProgramId
    // mintKey
    // // prefix for 


    // let metadata_seeds = &[
    //     PREFIX.as_bytes(),
    //     program_id.as_ref(),
    //     mint_info.key.as_ref(),
    // ];
    // let (metadata_key, metadata_bump_seed) =
    //     Pubkey::find_program_address(metadata_seeds, program_id);
    // let metadata_authority_signer_seeds = &[
    //     PREFIX.as_bytes(),
    //     program_id.as_ref(),
    //     mint_info.key.as_ref(),
    //     &[metadata_bump_seed],
    // ];

    // if metadata_account_info.key != &metadata_key {
    //     return Err(MetadataError::InvalidMetadataKey.into());
    // }


    var createAssocTokenIx = Token.createAssociatedTokenAccountInstruction(
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      tokenProgramId,
      apeMintAccount.publicKey,
      associatedAccountPublicKey,
      publicKey,
      publicKey
    );
    instructions.push(createAssocTokenIx);

    var apeAccountPublicKeyNonce = await PublicKey.findProgramAddress([
      Buffer.from("metadata", "utf8"), 
      metaplexAccount.toBuffer(), 
      apeMintAccount.publicKey.toBuffer()
    ], metaplexAccount);
    var apeAccountPublicKey = apeAccountPublicKeyNonce[0]



    var buf = Buffer.from([0x00, 0x0f, 0x00, 0x00, 0x00, 0x44, 0x65, 0x67, 0x65, 0x6e, 0x20, 0x41, 0x70, 0x65, 0x20, 0x23, 0x33, 0x37, 0x39, 0x34, 0x04, 0x00, 0x00, 0x00, 0x44, 0x41, 0x50, 0x45, 0x3f, 0x00, 0x00, 0x00, 0x68, 0x74, 0x74, 0x70, 0x73, 0x3a, 0x2f, 0x2f, 0x61, 0x72, 0x77, 0x65, 0x61, 0x76, 0x65, 0x2e, 0x6e, 0x65, 0x74, 0x2f, 0x31, 0x75, 0x53, 0x76, 0x46, 0x49, 0x68, 0x6b, 0x75, 0x69, 0x61, 0x7a, 0x6f, 0x5a, 0x70, 0x64, 0x6c, 0x61, 0x78, 0x4f, 0x44, 0x62, 0x31, 0x69, 0x68, 0x61, 0x6e, 0x31, 0x64, 0x36, 0x38, 0x57, 0x73, 0x47, 0x72, 0x50, 0x31, 0x75, 0x63, 0x33, 0x6f, 0x6f, 0x38, 0x00, 0x00, 0x00, 0x01])
    const createMetaplexMasterIx = new TransactionInstruction({
      keys: [
        { pubkey: apeAccountPublicKey, isSigner: false, isWritable: true },
        { pubkey: apeMintAccount.publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: systemProgramAccount, isSigner: false, isWritable: false },
        { pubkey: sysvarRentAccount, isSigner: false, isWritable: false },
      ],
      programId: metaplexAccount,
      data: apeBuffer,
    });
    instructions.push(createMetaplexMasterIx)

    var mintIx = Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      apeMintAccount.publicKey,
      associatedAccountPublicKey,
      publicKey,
      [],
      1,
    )
    instructions.push(mintIx);

    var apeAccountPublicKeyNonce = await PublicKey.findProgramAddress([
      Buffer.from("metadata", "utf8"), 
      metaplexAccount.toBuffer(), 
      apeMintAccount.publicKey.toBuffer(),
      Buffer.from("edition", "utf8"), 
    ], metaplexAccount);


    const metaplexAccountIx = new TransactionInstruction({
      keys: [
        { pubkey: apeAccountPublicKeyNonce[0], isSigner: false, isWritable: true },
        { pubkey: apeMintAccount.publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: apeAccountPublicKey, isSigner: false, isWritable: true},
        { pubkey: tokenProgramId, isSigner: false, isWritable: false},
        { pubkey: systemProgramAccount, isSigner: false, isWritable: false },
        { pubkey: sysvarRentAccount, isSigner: false, isWritable: false },
      ],
      programId: metaplexAccount,
      data: Buffer.from([10, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    instructions.push(metaplexAccountIx)



    sendTransaction(connection, wallet, instructions, accounts)
  }

  return (
    <div>
      <Input id='apeLink'></Input>
      <Button onClick = { () => { manual()  } } >Try it out!</Button>
      {/*<table id = "contentTable"></table>*/}
    </div>
    // <ConnectButton onClick = {airdrop}>TEST</ConnectButton>
  );
};
