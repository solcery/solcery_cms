import React from "react";
import { SType } from "../index";
import { TemplateData, Storage, TplObject } from "../../classes";
import { PublicKey, Connection } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from "borsh";
import { solceryTypes } from '../solceryTypes'

import { ValueRender, TypedataRender, NameRender } from "./components"

export class SLink extends SType {
  id = 5;
  static typename = "Link";
  valueRender = ValueRender;
  getName = (project: any) => {
    let template = project.getTemplate(this.templatePublicKey.toBase58());
    return `SLink<${template.code}>`;
  };

  templatePublicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  
  readValue = (reader: BinaryReader) => { 
    return reader.readPubkey() 
  }
  writeValue = (value: PublicKey, writer: BinaryWriter) => { 
    writer.writePubkey(value) 
  }
  readConstructed = (reader: BinaryReader) => {
    return reader.readU32()
  }
  writeConstructed = (value: number, writer: BinaryWriter) => {
    return writer.writeU32(value)
  }

  static typedataRender = TypedataRender;

  constructor(src: { templatePublicKey: PublicKey }) {
  	super()
  	this.templatePublicKey = src.templatePublicKey;
    
  }

  static readType = (reader: BinaryReader) => {
  	return new SLink({ templatePublicKey: reader.readPubkey() })
  }

  writeType = (writer: BinaryWriter) => {
  	writer.writePubkey(this.templatePublicKey)
  }

  cloneValue = (value: PublicKey) => new PublicKey(value)

  construct = (value: any, project: any) => {
    let obj = project.childrenById[value.toBase58()]
    if (!obj)
      throw new Error('Error constructing SLink type!')
    let customData = obj.parent.parent.customData
    if (customData.linkKey) {
      return obj.fields[customData.linkKey]
    }
    return obj.intId
  }
}

solceryTypes.set(5, SLink)
