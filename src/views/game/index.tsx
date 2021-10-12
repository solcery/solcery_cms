import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { useParams } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { GameState, GameSchema, Game } from "../../solcery/game"
import { Project } from "../../solcery/classes"
import { Button, Modal, Layout, Row } from 'antd';
import { ConnectButton } from "../../components/ConnectButton"
import { BinaryReader, BinaryWriter, deserializeUnchecked } from "borsh";

import "./style.css"

import axios from 'axios'
import {decodeMetadata, getMetadataAccount} from "../../metaplex/metadata";
import {clusterApiUrl, Connection, PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";

const { Header, Footer, Sider, Content } = Layout;

const {TOKEN_PROGRAM_ID} = require('@solana/spl-token');

const programId = new PublicKey("GN1p6pe6m7rdK3re2TayqJyQtJUme1EnCLyYrTAArYRR");

type GameViewParams = {
  gameId: string;
};

export const CardRender = (props: {
  card: any,
  picture?: string,
  onClick: () => void,
}) => {
  return (
    <div className="cardrender">
      <img
        className="cardframe"
        width="250px"
        src="https://cdn.discordapp.com/attachments/863663744194183198/896236065248141372/grey_wood_front.png"
        onClick={props.onClick}
      />
      <img 
        className="cardimage"
        src={props.picture ? props.picture : props.card.picture}
        width="235px"
        height="235px"
        onClick={props.onClick}
      /> 
      <p className="cardname">{ props.card.name }</p>
      <p className="carddescription">{ props.card.description }</p>
    </div>
  )
}

export const SlotSelector = (props: {
  slot: any,
  onChange: () => void,
  nfts: any,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => { setIsModalVisible(true) };
  const handleOk = () => { setIsModalVisible(false) };
  const handleCancel = () => { setIsModalVisible(false) };
  const selectNft = (index: number | undefined = undefined) => {
    if (props.slot.selected) {
      props.slot.selected.isSelected = false
      props.slot.selected = undefined
    }
    if (index !== undefined) {
      props.slot.selected = props.nfts[index]
      props.slot.selected.isSelected = true
    }
    props.onChange()
    handleOk()
  }

  return ( 
    <div>
      <CardRender 
        onClick={showModal}
        card={props.slot.selected ? props.slot.selected.cardType : props.slot.defaultCard}
        picture={props.slot.selected && props.slot.selected.picture}
      />
      <Modal title="Select an NFT" visible={isModalVisible} onOk={handleOk} width={1600} onCancel={handleCancel}> 
        <ScrollMenu scrollContainerClassName='scroller'>
          {props.slot.selected && <CardRender 
            onClick={() => { selectNft() }}
            card={props.slot.defaultCard}
          />}
          {props.nfts.map((elem: any, index: any) => {
            if (!elem.isSelected && props.slot.data.collections.find((publicKey: PublicKey) => publicKey.toBase58() === elem.collection))
              return (<CardRender 
                key={index}
                onClick={() => { selectNft(index) }}
                card={elem.cardType}
                picture={elem.picture}
              />)
            }
          )}
        </ScrollMenu>
      </Modal>
    </div>)
}

const getVerifiedCreator = (metadata: any) => {
  if (metadata.data === undefined || metadata.data.creators === undefined)
    return undefined
  for (let creator of metadata.data.creators) {
    if (creator.verified === 1)
      return creator.address
  }
}

const getCollection = (metadata: any, collections: any) => {
  for (let collectionKey of Object.keys(collections)) {
    if (checkCollection(metadata, collections[collectionKey])) {
      return collectionKey
    }
  }
}

const checkCollection = (metadata: any, collection: any) => {
  if (collection.updateAuthority && metadata.updateAuthority !== collection.updateAuthority)
    return false
  if (collection.symbol && metadata.data.symbol !== collection.symbol)
    return false
  if (collection.creator && getVerifiedCreator(metadata) !== collection.creator)
    return false
  return true
}

const loadNftsAsCollectionItems = async (mintPubkeys: PublicKey[], content: any) => {
  let collections = content.collections
  console.log(content)
  let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  let multipleAccountInfos = await connection.getMultipleAccountsInfo(mintPubkeys);
  let result: any[] = []
  for (let i in multipleAccountInfos) {
    if (multipleAccountInfos[i]) {
      let data = decodeMetadata(multipleAccountInfos[i]!.data)
      if (data) {
        var imageResponse = await axios.get(data.data.uri)
        console.log(data)

        let collectionKey = getCollection(data, collections)
        if (collectionKey) {
          let cardTypeKey = collections[collectionKey].cardType
          result.push({
            publicKey: mintPubkeys[i],
            cardTypeKey: cardTypeKey,
            cardType: content.cardTypes[cardTypeKey],
            data: data,
            picture: imageResponse.data.image,
            collection: collectionKey
          })
        }
      }
    }
  }
  return result
}


export const NftSelector = (props: {
  onChange: (filled: any) => void,
}) => { 
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  const { gameId } = useParams<GameViewParams>();
  const projectPublicKey = new PublicKey(gameId);
  const [ content, setContent ] = useState<any>(undefined)
  const [ slots, setSlots ] = useState<any>(undefined)
  const [ nfts, setNfts ] = useState<any>([]);

  const onChange = () => {
    props.onChange(slots.filter((elem: any) => elem.selected).map((elem: any) => {
      return {
        tplId: elem.data.id,
        mintAddress: elem.selected.publicKey,
        collection: elem.selected.collection,
      }
    }))
  }

  const getNfts = async() => {
    if (!wallet || wallet.publicKey == undefined)
      return []
    let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

    let response = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );
    let arr = response.value.splice(0, 100)

    let mints = await Promise.all(arr
      .filter(accInfo => accInfo.account.data.parsed.info.tokenAmount.uiAmount !== 0)
      .map(accInfo => getMetadataAccount(accInfo.account.data.parsed.info.mint))
    );

    return mints.map(m => new PublicKey(m));
  }

  useEffect(() => {
    (async () => {
      let project = await Project.get(connection, projectPublicKey)
      let constructedContent = await project.сonstructContent(connection)
      setContent(constructedContent)
      let slots = Object.values(constructedContent.slots)
      setSlots(slots.map((slot: any) => {
        let defaultCardTypeKey = slot.default.toBase58()
        let defaultCardType = constructedContent.cardTypes[defaultCardTypeKey]
        return {
          data: slot,
          defaultCard: constructedContent.cardTypes[slot.default]
        }
      }))
    })()
  }, [])

  useEffect(() => {
    if (wallet?.publicKey && content) {
      (async () => {
        setNfts(await loadNftsAsCollectionItems(await getNfts(), content))
      })()
    }
  }, [ content ])


  return ( 
    <Row>
      { slots && slots.map((elem: any) => <SlotSelector
        key={elem.data.id}
        slot={elem}
        nfts={nfts}
        onChange={onChange}
      />)}
    </Row>)

}

const unityGameContext = new UnityContext({
  loaderUrl: "game/game.loader.js",
  dataUrl: "game/game.data",
  frameworkUrl: "game/game.framework.js",
  codeUrl: "game/game.wasm",
})

export const GameView = () => {

  const { connected, wallet, publicKey } = useWallet();
  const connection = useConnection();
  const { gameId } = useParams<GameViewParams>();
  const projectPublicKey = new PublicKey(gameId);

  const [ gameContent, setGameContent ] = useState<any>(undefined);
  const [ playerStateData, setPlayerStateData ] = useState<Buffer|undefined>(undefined);
  const [ game, setGame ] = useState<Game|undefined>(undefined);
  const [ gameState, setGameState ] = useState<GameState|undefined>(undefined);
  const [ gamePublicKey, setGamePublicKey ] = useState<PublicKey|undefined>(undefined);
  const [ items, setItems ] = useState<any>([]);

  const playerStatePublicKey = new PublicKey('9RCmNwyM49CPyWqXgwgrPjtHVewMBLBYyS5MqGZUupe2')



  useEffect(() => {
    (async () => {
      let stateInfo = await connection.getAccountInfo(playerStatePublicKey)
      if (stateInfo) {
        connection.onAccountChange(playerStatePublicKey, (accountInfo) => {
          setPlayerStateData(accountInfo.data)
        })
        setPlayerStateData(stateInfo.data)
      }
    })()
  }, [])

  useEffect(() => {
    if (playerStateData) {
      var reader = new BinaryReader(playerStateData)
      let playerPublicKey = reader.readPubkey()
      let isInGame = reader.readBoolean()
      if (isInGame) {
        let gameKey = reader.readPubkey()
        setGamePublicKey(gameKey)
      } else {
        if (gamePublicKey)
          setGamePublicKey(undefined)
      }
    }
  }, [ playerStateData ])

  useEffect(() => {
    if (!gamePublicKey) {
      if (game)
        setGame(undefined)
      return
    }

    (async () => {
      let gameInfo = await connection.getAccountInfo(gamePublicKey)
      if (gameInfo?.data) {
        connection.onAccountChange(gamePublicKey, (accountInfo) => {
          setGame(deserializeUnchecked(
            GameSchema,
            Game,
            accountInfo.data,
          ))
        })
        setGame(deserializeUnchecked(
          GameSchema,
          Game,
          gameInfo.data,
        ))
      }
    })()    
  }, [ gamePublicKey ])
  
  useEffect(() => {
    if (!game) {
      if (gameState)
        setGameState(undefined)
      return
    }
    
    (async () => {
      let gameStateInfo = await connection.getAccountInfo(game.state)
      if (gameStateInfo?.data) {
        let project = await Project.get(connection, game.project)
        let constructedContent = await project.сonstructContent(connection)

        let state = new GameState()
        state.content = constructedContent
        let reader = new BinaryReader(gameStateInfo.data)
        state.read(reader)

        // applying items
        let allItems: any[] = []
        for (let player of game.players) {
          allItems = allItems.concat(player.items)
        }
        let collectionItems = await loadNftsAsCollectionItems(allItems.map((item: any) => item.publicKey ), state.content)
        let items = new Map();
        if (allItems.length != collectionItems.length)
          throw new Error("Wrong NFTs in game")
        for (let i in allItems) {
          items.set(allItems[i].tplId, collectionItems[i])
        }
        for (let slotId of Object.keys(state.content.slots)) {
          let slot = state.content.slots[slotId]
          let item = items.get(slot.id)
          if (item) {
            let cardType = state.content.cardTypes[item.cardTypeKey.toBase58()]
            cardType.picture = item.picture
            state.objects.forEach((card: any) => {
              if (card.tplId == slot.id) 
                card.tplId = cardType.id
            })
          }
          else {
            console.log('empty')
            state.objects.forEach((card: any) => {
              if (card.tplId == slot.id) 
                card.tplId = state.content.cardTypes[slot.default].id
            })
          } 
        }
        
        setGameState(state)
      }
    })()
  }, [ game ])

  useEffect(() => {
    if (!gameState)
      return
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  }, [ gameState ])

  const createPlayerState = async() => {
    if (!publicKey || wallet === undefined ) {
      return;
    }
    if (!wallet.publicKey)
      return
    var instructions = [];

    var stateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 65, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(65, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: stateAccount.publicKey,
    })); 

    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: stateAccount.publicKey, isSigner: false, isWritable: true }
      ],
      programId: programId,
      data: Buffer.from([5]),
    }));
    sendTransaction(connection, wallet, instructions, [ stateAccount ])
  }

  const createGame = async () => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var instructions = [];

    var gameAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 600, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(600, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameAccount.publicKey,
    }));

    let project = await Project.get(connection, projectPublicKey)
    let constructedContent = await project.сonstructContent(connection)
    let gm = new GameState(constructedContent)

    let writer = new BinaryWriter()
    let gameBuffer = gm.write(writer)
    let gameStateBuffer = writer.buf.slice(0, writer.length)
    var gameStateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: gameStateBuffer.length,
      lamports: await connection.getMinimumBalanceForRentExemption(gameStateBuffer.length, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameStateAccount.publicKey,
    }));

    // createGame
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: projectPublicKey, isSigner: false, isWritable: false },
        { pubkey: gameStateAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0]),
    }));


    // join game
    let keys = [
      { pubkey: publicKey, isSigner: true, isWritable: false },
      { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
    ];
    writer = new BinaryWriter()
    writer.writeU8(1)
    writer.writeU32(items.length)
    for (let item of items) {
      writer.writeU32(item.tplId)
      keys.push({
        pubkey: item.mintAddress,
        isSigner: false,
        isWritable: false,
      })
    }
    instructions.push(new TransactionInstruction({
      keys: keys,
      programId: programId,
      data: writer.buf.slice(0, writer.length)
    }));

    // set state
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: gameStateAccount.publicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.concat([
        Buffer.from([2]),
        Buffer.from([0, 0, 0, 0]),
        gameStateBuffer,
      ])
    }));

    sendTransaction(connection, wallet, instructions, [ gameAccount, gameStateAccount ])
  }

  const leaveGame = () => {
    if (!publicKey || wallet === undefined) 
      return;
    if (!gamePublicKey)
      return;
    let setStateIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gamePublicKey, isSigner: false, isWritable: true },
        { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([4, 0]),
    });

    sendTransaction(connection, wallet, [setStateIx], [])
  }

  unityGameContext.on("OnUnityLoaded", async () => {
    if (!gameState)
      return;
    var data = { IsConnected: true };
    unityGameContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));

    unityGameContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityGameContext.send("ReactToUnity", "UpdateDisplayData", JSON.stringify(gameState.extractDisplayData()));
    unityGameContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(gameState.extractGameState()));
  });


  unityGameContext.on("LogAction", async (log: string) => {
    if (!gameState || !game || !gamePublicKey)
      return;
    if (!publicKey || wallet === undefined) 
      return;
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 2) {
        leaveGame()
      }
      if (logEntry.actionType == 0)
      {
        let writer = new BinaryWriter()
        gameState.useCard(logEntry.data, logEntry.playerId)
        gameState.write(writer)

        let step = game.step
        let stepBuffer = Buffer.allocUnsafe(4)
        stepBuffer.writeUInt32LE(step)

        let setStateIx = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: false },
            { pubkey: gamePublicKey, isSigner: false, isWritable: true },
            { pubkey: game.state, isSigner: false, isWritable: true },
          ],
          programId: programId,
          data: Buffer.concat([
            Buffer.from([2]),
            Buffer.from(stepBuffer),
            writer.buf.slice(0, writer.length),
          ])
        });
        sendTransaction(connection, wallet, [setStateIx], [])
      }
    }
  });


return(
  connected ?
    <Layout>
      <Content>
        { gamePublicKey ? 
          
          <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityGameContext} />
          :
          <div>
            <NftSelector onChange={(result: any) => {
              setItems(result)
            }}/>
            <button className='glow-on-hover' onClick={createGame}>Create game</button>

          </div>
        }
      </Content>
    </Layout>
  :
    <ConnectButton/>    
  );
};
