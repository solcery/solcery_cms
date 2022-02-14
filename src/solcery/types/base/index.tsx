import { PublicKey, Connection } from "@solana/web3.js";
import ReactDOM from 'react-dom'
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from "../solceryTypes"
import { NameRender } from "./components"

export * from "./components";

export interface ValueRenderParams {
	type: SType,
	defaultValue?: any,  
	onChange?: (newValue: any) => void
}

export class SType {
  id: number = 0;
  static typename = "Empty type";
  typename = "Empty type";
  nameRender = (<NameRender type={this}/>);
  sorter: any; //TODO

  // static typedataRender: any = (<p>Error</p>);
  valueRender: any = null;
  
  readValue: (reader: BinaryReader) => any = (reader: BinaryReader) => { 
  	throw new Error('Trying to read empty type value') 
  };
  writeValue: (value: any, writer: BinaryWriter) => void = (value: any, writer: BinaryWriter) => { 
  	throw new Error('Trying to write empty type value')
  };

  writeType: (writer: BinaryWriter) => void = () => {};

  readConstructed = this.readValue;
  writeConstructed = this.writeValue;
  toObject = (value: any) => { return value }

  static readType = (reader: BinaryReader) => {
  	return new SType()
  }

  toBuffer = () => {
  	var writer = new BinaryWriter()
  	writer.writeSType(this)
  	return writer.buf.slice(0, writer.length)
  }

  construct = (value: any, project: any) => { return value }
}



declare module "borsh" {
  interface BinaryReader {
    readSType(): SType;
  }

  interface BinaryWriter {
    writeSType(value: SType): void;
  }
}

(BinaryReader.prototype).readSType = function readSType() {
  const reader = this;
  const typeId = reader.readU8();
  var type = solceryTypes.get(typeId)
  if (!type)
  	throw new Error("Error reading SType")
  var ret = type.readType(reader)
  if (ret != undefined) 
  	return ret
  throw new Error("Error reading SType")
};

(BinaryWriter.prototype).writeSType = function writeSType(value: SType) {
	const writer = this;
	writer.writeU8(value.id)
  value.writeType(writer)
};


