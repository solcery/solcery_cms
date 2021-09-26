import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender } from './components';

export class SString extends SType {
  id = 3;
  name = "String";
  valueRender = ValueRender;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  static readType = (reader: any) => {
  	return new SString()
  }
}

solceryTypes.set(3, SString)