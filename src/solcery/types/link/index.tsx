import React from "react";
import { SType } from "../index";
import { TemplateData, Storage, TplObject } from "../../classes";
import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from "borsh";
import { solceryTypes } from '../solceryTypes'

import { ValueRender, TypedataRender, NameRender } from "./components"

export class SLink extends SType {
  id = 5;
  name = "Link";

  templatePublicKey: PublicKey = new PublicKey('2WQzLh8J8Acmbzzi4qVmNv2ZX3hWycjHGMu7LRjQ8hbz');
  
  nameRender = (<p>Link</p>);
  readValue = (reader: BinaryReader) => { 
    return reader.readPubkey() 
  }
  writeValue = (value: string, writer: BinaryWriter) => { 
    writer.writePubkey(new PublicKey(value)) 
  }

  static typedataRender = TypedataRender;

  constructor(src: { templatePublicKey: PublicKey }) {
  	super()
  	this.templatePublicKey = src.templatePublicKey;
    this.nameRender = <NameRender templatePublicKey={ src.templatePublicKey }/>; //TOD: name
    this.valueRender = ValueRender;
  }

  static readType = (reader: BinaryReader) => {
  	return new SLink({ templatePublicKey: reader.readPubkey() })
  }

  writeType = (writer: BinaryWriter) => {
  	writer.writePubkey(this.templatePublicKey)
  }
}

solceryTypes.set(5, SLink)
