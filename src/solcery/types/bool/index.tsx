
import { SType, solceryTypes} from "../index";
import { BinaryReader, BinaryWriter } from 'borsh';
import { ValueRender } from './components'

export class SBool extends SType {
  id = 1;
  static typename = "Bool";
  valueRender = ValueRender;
  readValue = (reader: BinaryReader) => { return reader.readBoolean() };
  writeValue = (value: boolean, writer: BinaryWriter) => { writer.writeBoolean(value) };
  readConstructed = this.readValue;
  writeConstructed = this.writeValue;
  static readType = (reader: any) => {
  	return new SBool()
  }
}

solceryTypes.set(1, SBool)
