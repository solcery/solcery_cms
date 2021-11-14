import { PublicKey, Connection} from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from 'borsh';
import { SType, SBrick } from "../types";

export class ConstructedTemplate {
	code: string;
	schema: ConstructedSchema;
	objects: ConstructedObjects;

	constructor(src: { code: string, schema: ConstructedSchema, objects: ConstructedObjects }) {
		this.code = src.code;
		this.schema = src.schema;
		this.objects = src.objects;
	}

	static read(reader: BinaryReader) {
		let code = reader.readString();
		let schema = ConstructedSchema.read(reader);
		let objects = ConstructedObjects.read(reader, schema);
		return new ConstructedTemplate({ code, schema, objects });
	}

	write(writer: BinaryWriter) {
		writer.writeString(this.code)
		this.schema.write(writer)
		this.objects.write(writer, this.schema)
	}

	toObject() {
		return {
			name: this.code,
			objects: this.objects.toArray(this.schema)
		}
	}
}


export class ConstructedFieldData {
	id: number;
	code: string;
	type: SType;

	constructor(src: { id: number, code: string, type: SType }) {
		this.id = src.id;
		this.code = src.code;
		this.type = src.type;
	}

	static read(reader: BinaryReader) {
		let id = reader.readU8();
		let code = reader.readString();
		let type = reader.readSType();
		return new ConstructedFieldData({ id, code, type });
	}

	write(writer: BinaryWriter) {
		writer.writeU8(this.id)
		writer.writeString(this.code)
		writer.writeSType(this.type)
	}
}

export class ConstructedSchema {
	fields: Map<number, ConstructedFieldData>;

	constructor(src: { fields: Map<number, ConstructedFieldData>}) {
		this.fields = src.fields;
	}

	static read(reader: BinaryReader) {
		let schemaSize = reader.readU8();
		let fields = new Map<number, ConstructedFieldData>();
		for (let i = 0; i < schemaSize; i++) {
			let fieldData = ConstructedFieldData.read(reader);
			fields.set(fieldData.id, fieldData);
		}
		return new ConstructedSchema({ fields })
	}

	write(writer: BinaryWriter) {
		writer.writeU8(this.fields.size)
		for (let fieldData of this.fields.values()) {
			fieldData.write(writer)
		}
	}

	getConstructedFieldData(id: number) {
		let fieldData = this.fields.get(id);
		if (!fieldData) {
			throw new Error("Error getting field data");
		}
		return fieldData;
	}
}

export class ConstructedObject {
	id: number;
	data: Map<number, any>;

	constructor(src: { id: number, data: Map<number, any> }) {
		this.id = src.id;
		this.data = src.data;
	}
	static read(reader: BinaryReader, schema: ConstructedSchema) {
		let id = reader.readU16();
		let fieldsNumber = reader.readU8();
		let data = new Map<number, any>();
		for (let i = 0; i < fieldsNumber; i++) {
			let fieldId = reader.readU8();
			let fieldData = schema.getConstructedFieldData(fieldId);
			let value = fieldData.type.readConstructed(reader)
			data.set(fieldId, value);
		}
		return new ConstructedObject({ id, data });
	}

	write(writer: BinaryWriter, schema: ConstructedSchema) {
		writer.writeU16(this.id)
		writer.writeU8(this.data.size)
		for (let [ fieldId, value ] of this.data) {
			writer.writeU8(fieldId)
			let fieldData = schema.getConstructedFieldData(fieldId);
			fieldData.type.writeConstructed(value, writer)
		}
	}

	toObject(schema: ConstructedSchema) {
		let data = new Map<string, any>();
		for (let [ fieldId, value ] of this.data) {
			let fieldData = schema.getConstructedFieldData(fieldId);
			data.set(fieldData.code, fieldData.type.toObject(value));
		}
		var res =  Object.fromEntries(data)
		res.id = this.id
		return res
	}
}

export class ConstructedObjects {
	objects: Map<number, any>;
	raw: Map<number, ConstructedObject>;

	constructor(src: { objects: Map<number, ConstructedObject>, schema: ConstructedSchema }) {
		this.raw = src.objects;
		this.objects = new Map()
		for (let raw of this.raw.values()) {
			this.objects.set(raw.id, raw.toObject(src.schema))
		}
	}

	static read(reader: BinaryReader, schema: ConstructedSchema) {
		let objectsNumber = reader.readU16();
		let objects = new Map<number, ConstructedObject>();
		for (let i = 0; i < objectsNumber; i++) {
			let object = ConstructedObject.read(reader, schema);
			objects.set(object.id, object);
		}
		return new ConstructedObjects({ objects, schema })
	}

	write(writer: BinaryWriter, schema: ConstructedSchema) {
		writer.writeU16(this.raw.size)
		for (let raw of this.raw.values()) {
			raw.write(writer, schema)
		}
	}

	toArray(schema: ConstructedSchema) {
		let result: any[] = []
		for (let raw of this.raw.values()) {
			result.push(raw.toObject(schema))
		}
		return result
	}
}

export class ConstructedContent {
	templates: Map<string, ConstructedTemplate>;
	constructor(src: { templates: Map<string, ConstructedTemplate>} ) {
		this.templates = src.templates
	}

	static fromBuffer(buf: Buffer) {
		let reader = new BinaryReader(buf)
		return this.read(reader)
	}

	toBuffer() {
		let writer = new BinaryWriter()
		this.write(writer)
		return writer.buf.slice(0, writer.length)
	}

	static read(reader: BinaryReader) {
		let templatesNumber = reader.readU16();
		let templates = new Map<string, ConstructedTemplate>();
		for (let i = 0; i < templatesNumber; i++) {
			let tpl = ConstructedTemplate.read(reader)
			templates.set(tpl.code, tpl)
		}
		return new ConstructedContent({ templates })
	}

	write (writer: BinaryWriter) {
		writer.writeU16(this.templates.size)
		for (let template of this.templates.values()) {
			template.write(writer)
		}
	}

	getAll(templateCode: string) {
		let tpl = this.templates.get(templateCode)
		if (!tpl)
			return new Map()
		return tpl.objects.objects
	}


	get(templateCode: string, objectId: number | undefined = undefined, or: any = undefined) {
		let objects = this.getAll(templateCode)
		if (!objectId)
			return (Array.from(objects.values()))
		let obj = objects.get(objectId)
		if (!obj) {
			if (!or)
				throw new Error("No such object and no default value")
			return or
		}
		return obj
	}

	toObject() {
		let result: any = {}
		for (let template of this.templates.values()) {
			result[template.code] = template.toObject()
		}
		return result
	}

	toJson() {
		return JSON.stringify(this.toObject(), (k: string, v: any) => {
			if (v instanceof SType) {
				return undefined
			}
			return v
		})
	}
}




