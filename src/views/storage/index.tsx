import React, { useCallback } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, PublicKey, Account, TransactionInstruction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { ConnectButton } from "./../../components/ConnectButton";
import { LABELS } from "../../constants";
import {
  deserializeUnchecked, BinaryReader, BinaryWriter, serialize
} from 'borsh';

import { useParams } from "react-router-dom";
import { Button } from "antd";

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
    var field = template.getField(fieldId)
    if (field === undefined)
      throw new Error("Error deserializing tpl Object")
    if (field.fieldType == 1) {
      result.set(field.id, reader.readU32());
    }
    if (field.fieldType == 2) {
      result.set(field.id, reader.readString());
    }
    var fieldId = reader.readU32();
  }
  var ret = Object.fromEntries(result)
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
    ['storages', [ 'pubkey' ]],
    ['maxFieldIndex', 'u32'],
    ['fields', [ TemplateField ]],
]});
TemplateSchema.set(TemplateField, { kind: 'struct', fields: [
    ['id', 'u32'],
    ['fieldType', 'u8'],
    ['name', 'string'],
]});

type StorageViewParams = {
  templateId: string;
};

export const StorageView = () => {


  // console.log("1")
  // console.log("TEEEST")
  let { templateId } = useParams<StorageViewParams>();
  console.log("Template");
  console.log(templateId);

  



  (BinaryReader.prototype).readPubkey = function readPubkey() {
    const reader = this;
    const array = reader.readFixedArray(32);
    console.log(array);
    return new PublicKey(array);
  };

  (BinaryWriter.prototype).writePubkey = function writePubkey(value: PublicKey) {
    const writer = this;
    writer.writeFixedArray(value.toBuffer());
  };

  const connection = useConnection();
  const { wallet, publicKey } = useWallet();

  const programId = new PublicKey('DZyJMt5pQWJS9gzbeLydrwcoi6SyswKFkHhKU9c6Arij');
  const projectStorage = new PublicKey('CcRxfCCrQPxUaVSzopJt5NgcmSfdJV2dyzTroofgqhxy');
  const storagePubkey = new PublicKey(templateId);

  const getAccountData = async (publicKey: PublicKey) => {
    var accountInfo = await connection.getAccountInfo(publicKey);
    return accountInfo?.data
  }

  const getTemplateInfo = async (publicKey: PublicKey) => {
    var templateData = await getAccountData(publicKey)
    if (templateData === undefined)
      throw new Error("Not a template")
    return deserializeUnchecked(
      TemplateSchema,
      TemplateData,
      templateData.slice(1),
    );
  }

  const getObjectInfo = async (templateData: TemplateData, publicKey: PublicKey) => {
    var objectData = await getAccountData(publicKey)
    if (objectData === undefined)
      throw new Error("Not an object")
    objectData = objectData.slice(1)
    return deserializeTplObject(new BinaryReader(objectData), templateData)
  }

  const createEmptyAccount = async (accountSize: number) => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    var accountCost = await connection.getMinimumBalanceForRentExemption(accountSize, 'singleGossip')
    var newAccount = new Account()
    connection.requestAirdrop(publicKey, accountCost)
    var createAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: accountSize, // TODO
      lamports: accountCost,
      fromPubkey: publicKey,
      newAccountPubkey: newAccount.publicKey,
    });
    await sendTransaction(connection, wallet, [createAccountIx], [newAccount])
  }


  const createTemplate = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }

    var accounts = [];
    var instructions = []
    connection.requestAirdrop(publicKey, 5 * LAMPORTS_PER_SOL)
    var templateAccount = new Account();
    var createTemplateAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: templateAccount.publicKey,
    });
    accounts.push(templateAccount);
    instructions.push(createTemplateAccountIx);

    var storageAccount = new Account();
    var createStorageAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: storageAccount.publicKey,
    });
    accounts.push(storageAccount);
    instructions.push(createStorageAccountIx);


    const createTemplateIx = new TransactionInstruction({
      keys: [
        { pubkey: templateAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: projectStorage, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0, 0]),
    });
    instructions.push(createTemplateIx);
    sendTransaction(connection, wallet, instructions, accounts)
  }

  const getInfo = async () => {
    var result: Template[] = []
    var projectStorageInfo = await connection.getAccountInfo(projectStorage);
    console.log(projectStorageInfo?.data)
    if (projectStorageInfo?.data) {
      var storage = deserializeUnchecked(
        StorageSchema,
        Storage,
        projectStorageInfo.data
      );
      for (let account of storage.accounts) {
        console.log('newAccount')
        var tplData = await getAccountData(account);
        if (tplData) {
          tplData = tplData.slice(1)
          console.log(tplData)
          var template = deserializeUnchecked(
            TemplateSchema,
            TemplateData,
            tplData
          );
          template.publicKey = account;
          result.push(template)
          console.log(template.publicKey.toBase58())
          console.log(template.storage.toBase58())
          // 61ubZDgHTi3G6SpMFUbnRSfe8pmikdVuH1ZsVbZsLdRz
          // CfkFMypFk2XCALPhVbhvkHGJqCVE3h3S7AbgJYZY8ph9
          if (template.storage) {
            let objects = []
            var tplStorageData = await getAccountData(template.storage);
            if (tplStorageData) {
              var storage = deserializeUnchecked(
                StorageSchema,
                Storage,
                tplStorageData
              );
              for (let obj of storage.accounts) {
                var x = await getObjectInfo(template, obj)
                x.publicKey = obj
                objects.push(x)
              }
            }
            template.objects = objects
            console.log(template)
            return template
          }
        }
      }
    }
  }

  const getTemplateStorage = async (templatePubkey: PublicKey) => {
    var tplData = await getAccountData(templatePubkey);
    if (tplData) {
      tplData = tplData.slice(1)
      var template = deserializeUnchecked(
        TemplateSchema,
        TemplateData,
        tplData
      );
      template.publicKey = templatePubkey;
      if (template.storage) {
        let objects = []
        var tplStorageData = await getAccountData(template.storage);
        if (tplStorageData) {
          var storage = deserializeUnchecked(
            StorageSchema,
            Storage,
            tplStorageData
          );
          for (let objectPubkey of storage.accounts) {
            var objInfo = await getObjectInfo(template, objectPubkey)
            objInfo.publicKey = objectPubkey
            objects.push(objInfo)
          }
        }
        template.objects = objects
        return template
      }
    }
  }

  const createObject = async () => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }

    var writer = new BinaryWriter()
    writer.writeU32(7)
    writer.writeU32(16)
    writer.writeU32(5)
    writer.writeString("First Object")
    var storageKey = new PublicKey('CfkFMypFk2XCALPhVbhvkHGJqCVE3h3S7AbgJYZY8ph9')

    var objectAccount = new Account()
    var createObjectAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: objectAccount.publicKey,
    });
    const createObjectIx = new TransactionInstruction({
      keys: [
        { pubkey: objectAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([ Buffer.from([1, 0]), writer.buf.slice(0, writer.length)]),
    });
    sendTransaction(connection, wallet, [createObjectAccountIx, createObjectIx], [objectAccount])
  }

  const popFromStorage = async() => {
    if (!publicKey) {
      return;
    }
    if (wallet === undefined) {
      return;
    }
    var storageKey = new PublicKey('CfkFMypFk2XCALPhVbhvkHGJqCVE3h3S7AbgJYZY8ph9')
    var objectKey = new PublicKey('6tpjt4rDR6i3Na5e8GQZt7fo7VkyrvN3uPT5Xjwdf528')
    const popFromStorageIx = new TransactionInstruction({
      keys: [
        { pubkey: storageKey, isSigner: false, isWritable: true },
        { pubkey: objectKey, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: Buffer.from([2, 1]),
    });
    sendTransaction(connection, wallet, [popFromStorageIx], [])
  }

  const addTemplateField = async (fieldType: number, fieldName: string) => {
    var projectStorageInfo = await connection.getAccountInfo(projectStorage);
    console.log(projectStorageInfo?.data)
    if (projectStorageInfo?.data) {
      var storage = deserializeUnchecked(
        StorageSchema,
        Storage,
        projectStorageInfo.data
      );
      for (let account of storage.accounts) {
        console.log('newAccount')
        var tplData = await getAccountData(account);
        if (tplData) {
          tplData = tplData.slice(1)
          console.log(tplData)
          var template = deserializeUnchecked(
            TemplateSchema,
            TemplateData,
            tplData
          );
          console.log(template);
          const fieldNameBuffer = Buffer.from(fieldName);
          const updateTemplateIx = new TransactionInstruction({
            keys: [
              { pubkey: account, isSigner: false, isWritable: true },
            ],
            programId: programId,
            data: Buffer.concat([Buffer.from([0, 1, fieldType]), fieldNameBuffer]),
          });
          if (wallet) {
            return await sendTransaction(connection, wallet, [updateTemplateIx], []).then(async () => {
              var newTplData = await getAccountData(account);
              if (newTplData !== undefined) {
                newTplData = newTplData.slice(1)
                var template = deserializeUnchecked(
                  TemplateSchema,
                  TemplateData,
                  newTplData
                );
                console.log(template);

              }
            })
          }
        }
      }
    }
  }


  const renderIntoTable = async (templatePubkey: PublicKey) => {
    // var table: HTMLTableElement = document.createElement("TABLE") as HTMLTableElement;
    var table: HTMLTableElement | null = document.getElementById("templateTable") as HTMLTableElement;
    if (table) {
      console.log('table is here')
      var tplData = await getTemplateStorage(templatePubkey)
      table.innerHTML = "" // clear table
      var row = table.insertRow(0);
      var cell = row.insertCell(0);
      cell.innerHTML = "Object id";
      var cellIndex = 1;
      for (let field of tplData.fields) {
        var cell = row.insertCell(cellIndex);
        cell.innerHTML = "[" + field.id + "] " + field.name;
        cellIndex++;
      }

      var rowIndex = 1;
      for (let object of tplData.objects) {
        var row = table.insertRow(rowIndex)
        var cell = row.insertCell(0)

        var anchor = document.createElement("a") as HTMLAnchorElement;
        anchor.href = "/#/object/" + object.publicKey;
        anchor.innerHTML = object.publicKey;
        console.log(anchor.outerHTML)
        cell.appendChild(anchor);
        var cellIndex = 1;
        for (let field of tplData.fields) {
          var cell = row.insertCell(cellIndex);
          cell.innerHTML = object[field.id];
          cellIndex ++;
        }
        rowIndex++;
      }
    }
  }

  const removeTemplateField = async (fieldId: number) => {
    var result: Template[] = []
    var projectStorageInfo = await connection.getAccountInfo(projectStorage);
    console.log(projectStorageInfo?.data)
    if (projectStorageInfo?.data) {
      var storage = deserializeUnchecked(
        StorageSchema,
        Storage,
        projectStorageInfo.data
      );
      for (let account of storage.accounts) {
        console.log('newAccount')
        var tplData = await getAccountData(account);
        if (tplData) {
          tplData = tplData.slice(1)
          console.log(tplData)
          var template = deserializeUnchecked(
            TemplateSchema,
            TemplateData,
            tplData
          );
          console.log(template);
          var buf = Buffer.allocUnsafe(4);
          buf.writeUInt32LE(fieldId);
          const updateTemplateIx = new TransactionInstruction({
            keys: [
              { pubkey: account, isSigner: false, isWritable: true },
            ],
            programId: programId,
            data: Buffer.concat([
              Buffer.from([0, 2,]),
              buf,
            ]),
          });
          if (wallet) {
            await sendTransaction(connection, wallet, [updateTemplateIx], []).then(async () => {
              var newTplData = await getAccountData(account);
              if (newTplData !== undefined) {
                newTplData = newTplData.slice(1)
                var template = deserializeUnchecked(
                  TemplateSchema,
                  TemplateData,
                  newTplData
                );
                console.log(template);

              }
            })
          }
        }
      }
    }
  }

  renderIntoTable(new PublicKey('61ubZDgHTi3G6SpMFUbnRSfe8pmikdVuH1ZsVbZsLdRz'))

  console.log('test')

  return (
    <div>
      <table id = "templateTable"></table>
    </div>
    // <ConnectButton onClick = {airdrop}>TEST</ConnectButton>
  );
};
