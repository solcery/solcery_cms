import { ValueRender } from "./components"
import { SType } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { solceryTypes } from "../solceryTypes"

export class SInt extends SType {
  id = 2;
  name = "Integer";
  
  valueRender = ValueRender;

  readValue = (reader: BinaryReader) => { 
    return reader.readU32() 
  };

  writeValue = (value: number, writer: BinaryWriter) => { 
    writer.writeU32(value) 
  };

  static readType = (reader: any) => {
  	return new SInt()
  }
}

solceryTypes.set(2, SInt)
