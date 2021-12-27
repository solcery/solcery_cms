import { deserializeUnchecked, BinaryReader } from 'borsh';
import { PublicKey, Connection } from "@solana/web3.js";
import { schema, TemplateData } from './schema'

let Master: any = {}

Master.fromBinary = function(data: any) {
  let template = this.parent.parent
  let reader = new BinaryReader(data)
  this.fields = {}
  this.intId = reader.readU32() // integer id
  reader.readPubkey() // templatePubkey
  var fieldsAmount = reader.readU32()
  var fieldOffsets = [];
  for (let i = 0; i < fieldsAmount; i++) {
    fieldOffsets.push({
      id: reader.readU32(),
      start: reader.readU32(),
      end: reader.readU32(),
    })
  }
  var dataLength = reader.readU32()
  var rawData = reader.readFixedArray(dataLength)
  for (let fieldOffset of fieldOffsets) {
    var field = template.fields[fieldOffset.id]
    var rawFieldData = Buffer.from(rawData.subarray(fieldOffset.start, fieldOffset.end))
    var valueReader = new BinaryReader(rawFieldData)
    var stype = field.fieldType
    this.fields[field.code] = stype.readValue(valueReader)
  }
  if (this.intId === 966 )
    console.log(this)
}

export { Master }
