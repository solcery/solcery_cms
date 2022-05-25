import { SType, solceryTypes } from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender } from './components';

export class SString extends SType {
  id = 3;
  static typename = 'String';
  getName = (project: any) => 'SString';
  valueRender = ValueRender;
  readValue = (reader: BinaryReader) => { return reader.readString() }
  writeValue = (value: string, writer: BinaryWriter) => { writer.writeString(value) }
  
  readConstructed = this.readValue;
  writeConstructed = this.writeValue;

  static readType = (reader: any) => {
  	return new SString()
  }
}

solceryTypes.set(3, SString)