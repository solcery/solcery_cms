import { deserializeUnchecked, BinaryReader, BinaryWriter } from 'borsh';
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
}

Master.toBinary = function() {
  let template = this.parent.parent
  let offsetWriter = new BinaryWriter()
  let dataWriter = new BinaryWriter()
  offsetWriter.writeU32(Object.keys(this.fields).length)
  for (let fieldId of Object.keys(template.fields)) {
    let templateField = template.fields[fieldId]
    if (this.fields[templateField.code]) {
      offsetWriter.writeU32(templateField.id)
      offsetWriter.writeU32(dataWriter.length)
      templateField.fieldType.writeValue(this.fields[templateField.code], dataWriter)
      offsetWriter.writeU32(dataWriter.length)
    }
  }
  offsetWriter.writeU32(dataWriter.length)
  return Buffer.concat([
    offsetWriter.buf.slice(0, offsetWriter.length),
    dataWriter.buf.slice(0, dataWriter.length)
  ])
}

Master.onSolanaAccountChanged = function (connection: Connection, data: any) {

}

export { Master }
