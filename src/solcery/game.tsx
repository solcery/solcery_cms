import { applyBrick } from "./types/brick";
import { BinaryReader, BinaryWriter } from "borsh";
import { PublicKey } from "@solana/web3.js";
export { programId } from "./engine"

type GameObject = {
	id: number,
	tplId: any, 
	attrs: any,
}

export class PlayerItem {
  tplId: number;
  publicKey: PublicKey;

  constructor(src: { tplId: number, publicKey: PublicKey }) {
    this.tplId = src.tplId
    this.publicKey = src.publicKey
  }
}

export class Player {
  publicKey: PublicKey;
  online: boolean;
  items: PlayerItem[];

  constructor(src: { publicKey: PublicKey, online: boolean, items: PlayerItem[] }) {
    this.publicKey = src.publicKey
    this.online = src.online
    this.items = src.items
  }
}

export class Game {
  project: PublicKey;
  state: PublicKey;
  step: number;
  players: Player[];
  finished: boolean;
  winners: PublicKey[];

  constructor(src: { project: PublicKey, state: PublicKey, step: number, players: Player[], finished: boolean, winners: PublicKey[] }) {
    this.project = src.project
    this.state = src.state
    this.step = src.step
    this.players = src.players
    this.finished = src.finished
    this.winners = src.winners
  }
}

export const GameSchema = new Map()
GameSchema.set(Game, { kind: 'struct', fields: [
    ['project', 'pubkey'],
    ['state', 'pubkey'],
    ['step', 'u32'],
    ['players', [ Player ]],
    ['finished', 'boolean'],
    ['winners', [ 'pubkey' ]],
]});
GameSchema.set(Player, { kind: 'struct', fields: [
    ['publicKey', 'pubkey'],
    ['online', 'boolean'],
    ['items', [ PlayerItem ]]
]});
GameSchema.set(PlayerItem, { kind: 'struct', fields: [
    ['tplId', 'u32'],
    ['publicKey', 'pubkey'],
]});

export class GameState {
	objects: Map<number, GameObject> = new Map();
	content: any = undefined;

  initObjects = () => {
    if (!this.content || !this.content.attributes || !this.content.cards)
      return
	  var cards = this.content.cards
    var attributes = this.content.attributes
	  var cardId = 0
	  for (let cardPackId in cards) { 
	    let cardPack = cards[cardPackId]
	    for (let i = 0; i < cardPack.amount; i++) {
	      var cardType = this.content.cardTypes[cardPack.cardType.toBase58()]
        var attrs: any = {}
        for (let contentAttrId of Object.keys(attributes)) {
          let contentAttr = attributes[contentAttrId]
          attrs[contentAttr.code] = 0
        }
        attrs.place = cardPack.place

	      this.objects.set(cardId, {
	      	id: cardId,
	        tplId: cardType.id,
	        attrs: attrs
	      })
        if (cardPack.initializer) {
          console.log(cardPack.initializer)
          let ctx = new Context({
            game: this,
            object: this.objects.get(cardId),
            extra: {},
          })
          applyBrick(cardPack.initializer, ctx)
        }
	      cardId++;
	    }
	  }
    let slots = this.content.slots
    if (slots) {
      for (let slotId of Object.keys(slots)) {
        var attrs: any = {}
        for (let contentAttrId of Object.keys(attributes)) {
          let contentAttr = attributes[contentAttrId]
          attrs[contentAttr.code] = 0
        }
        attrs.place = slots[slotId].place
        this.objects.set(cardId, {
          id: cardId,
          tplId: slots[slotId].id,
          attrs: attrs
        })
        cardId++;
      }
    }
  }

  constructor(content: any = undefined) {
    if (content) {
      this.content = content
      this.initObjects()
    }
  }

  write = (writer: BinaryWriter) => {
    writer.writeU32(this.objects.size)
    for (let [_, object ] of this.objects) {
      writer.writeU32(object.tplId)
      for (let value of Object.values(object.attrs)) {
        writer.writeI32(parseInt(value as string))
      }
    }
  }

  read = (reader: BinaryReader) => {
    if (!this.content)
      throw new Error("Error loading gameState from buffer!")
    this.objects = new Map()
    let attrs = Object.values(this.content.attributes).map((elem: any) => { return elem.code })
    let objectsNumber = reader.readU32()
    for (let id = 1; id <= objectsNumber; id++) {
      let attrMap = new Map()
      let tplId = reader.readU32()
      attrs.forEach((attr) => {
        attrMap.set(attr, reader.readI32())
      })
      this.objects.set(id, {
        id: id,
        tplId: tplId,
        attrs: Object.fromEntries(attrMap)
      })
    }
  }

	useCard = (cardId: number, playerId: number) => {
		let object = this.objects.get(cardId)
		if (!object)
			throw new Error("Attempt to cast unexistent card!")
		let ctx = new Context({
			game: this,
			object: object,
			extra: { vars: new Map([[ 'playerId', playerId ]]) },
		})
		let cardTypes = this.content.cardTypes
		for (let cardTypeKey in cardTypes) {
			var cardType = cardTypes[cardTypeKey]
			if ((cardType.id == object.tplId) || cardType.action) {
				applyBrick(cardType.action, ctx)
			}
		}
	}

	extractGameState = () => {
		return {
      Cards: this.objectsToCards()
    }
	}

  extractContent = () => {
    return {
      CardTypes: constructCardTypes(this.content),
    }
  }

  extractDisplayData = () => {
    return {
      PlaceDisplayDatas: constructPlaces(this.content)
    }
  }

	objectsToCards = () => {
		var result: Card[] = []
		for (let [ gameObjectId, gameObject ] of this.objects) { 
			result.push({
				CardId: gameObjectId,
				CardType: gameObject.tplId,
				CardPlace: gameObject.attrs.place,
			})
		}
		return result
	}	

}

class Context {
	vars: Map<string, number> = new Map();
	game: GameState;
	object: any;
  args: any[] = []
	constructor(src: { game: GameState, object: any, extra?: any}) {
		this.object = src.object;
		this.game = src.game;
		this.vars = src.extra?.vars
	}
}

const constructPlaces = (content: any) => {
  var result = []
  var placesContent = content.places
  if (!placesContent)
    return
  for (let placeId in placesContent) { 
    let place = placesContent[placeId]
    result.push({
      PlaceName: place.name,
      PlaceId: place.placeId,
      PlacePlayer: place.playerMode,
      IsInteractable: place.interactableForActiveLocalPlayer,
      IsVisible: place.visible,
      HorizontalAnchors: {
        Min: (place.x1 ? place.x1 : 0) / 10000,
        Max: (place.x2 ? place.x2 : 0) / 10000,
      },
      VerticalAnchors: {
        Min: (place.y1 ? place.y1 : 0) / 10000,
        Max: (place.y2 ? place.y2 : 0) / 10000,
      },
      CardFaceOption: place.face ? place.face : 0,
      CardLayoutOption: place.layout ? place.layout : 0,
    })
  }
  return result
}


const constructBoardData = (content: any) => {
  var result = {
    LastUpdate: Date.now(),
    Players: constructPlayers(),
    Cards: [],
    Message: {
      Nonce: 1,
      Message: "No message",
      Duration: 5,
    },
    Random: {
      x: 1,
      y: 2,
      z: 3,
      w: 4,
    },
    EndTurnCardId: 5,
  }
  return result
}


type FightLog = {
  Steps: LogEntry[],
}

type LogEntry = {
  playerId: number,
  actionType: number,
  data: number,
}

type Card = { // TODO: from content
  CardId: number,
  CardType: number,
  CardPlace: number,
}

type OldPlayer = {
  Address: string,
  IsActive: boolean,
  HP: number,
  Coins: number,
  IsMe: boolean,
  Attrs: number[]
}

type CardType = { //TODO: from content
  Id: number,
  Metadata: {
    Picture: number,
    PictureUrl: string,
    Coins: number,
    Name: string,
    Description: string,
  },
  BrickTree: any, // TODO: brick
}

type BoardData = {
  LastUpdate: number,
  Players: OldPlayer[],
  Cards: Card[],
  Message: {
    Nonce: number,
    Message: string,
    Duration: number
  }
  Random: {
    x: number,
    y: number,
    z: number,
    w: number,
  }
  EndTurnCardId: number
}


const constructCardTypes = (content: any) => {
  var result: CardType[] = []
  var cardTypesContent = content.cardTypes
  if (!cardTypesContent)
    return result
  for (let cardTypeId in cardTypesContent) { 
    let cardType = cardTypesContent[cardTypeId]
    result.push({
      Id: cardType.id,
      BrickTree: {},
      Metadata: {
        Picture: cardType.pictureNumber,
        PictureUrl: cardType.picture,
        Coins: cardType.coins,
        Name: cardType.name,
        Description: cardType.description,
      }
    })
  }
  return result
} 

const constructPlayers = () => {
 return [
  {
    Address: "None",
    IsActive: true,
    HP: 25,
    Coins: 0,
    IsMe: true,
    Attrs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    Address: "None",
    IsActive: false,
    HP: 25,
    Coins: 0,
    IsMe: false,
    Attrs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
 ]
}

