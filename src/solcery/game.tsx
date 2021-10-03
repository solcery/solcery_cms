
import { applyBrick } from "./types/brick";
export { programId } from "./engine"

type GameObject = {
	id: number,
	tplId: any, 
	attrs: any,
}

export class Game {
	objects: Map<number, GameObject> = new Map();
	content: any = undefined;

	constructor(content: any) {
	  this.content = content
	  if (!content)
	  	return
	  var cardsContent = content.cards
	  if (!cardsContent)
	    return
	  var cardId = 0
    var attributes = content.attributes
	  for (let cardPackId in cardsContent) { 
	    let cardPack = cardsContent[cardPackId]
	    for (let i = 0; i < cardPack.amount; i++) {
	      var cardType = content.cardTypes[cardPack.cardType.toBase58()]
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
	      cardId++;
	    }
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
			if (cardType.id == object.tplId) {
				applyBrick(cardType.action, ctx)
			}
		}
		
	}

	toBoardData = () => {
		var bd: BoardData = constructBoardData(this.content)
		bd.Cards = this.objectsToCards()
		return bd
	}

  extractContent = () => {
    return {
      CardTypes: constructCardTypes(this.content),
      DisplayData: constructDisplayData(this.content),
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
	game: Game;
	object: any;
  args: any = {};
	constructor(src: { game: Game, object: any, extra?: any}) {
		this.object = src.object;
		this.game = src.game;
		this.vars = src.extra?.vars
	}
}



const constructDisplayData = (content: any) => {
  return {
    PlaceDisplayDatas: constructPlaces(content)
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
      AreCardsInteractableIfMeIsActive: place.interactableForActiveLocalPlayer,
      IsVisible: place.visible,
      HorizontalAnchors: {
        Min: place.x1 / 10000,
        Max: place.x2 / 10000,
      },
      VerticalAnchors: {
        Min: place.y1 / 10000,
        Max: place.y2 / 10000,
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

type Player = {
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
  Players: Player[],
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

