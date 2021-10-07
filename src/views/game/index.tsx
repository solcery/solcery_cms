import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { useParams } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { GameState, GameSchema, Game } from "../../solcery/game"
import { Project } from "../../solcery/classes"
import { Button, Modal } from 'antd';
import { ConnectButton } from "../../components/ConnectButton"
import { BinaryReader, BinaryWriter, deserializeUnchecked } from "borsh";



import "./style.css"

import axios from 'axios'
import {decodeMetadata, getMetadataAccount} from "../../metaplex/metadata";
import {clusterApiUrl, Connection, PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";

const {TOKEN_PROGRAM_ID} = require('@solana/spl-token');

const programId = new PublicKey("GN1p6pe6m7rdK3re2TayqJyQtJUme1EnCLyYrTAArYRR");

type GameViewParams = {
  gameId: string;
};

export const NftSelector = () => { 
  const { connected, wallet } = useWallet();
  const connection = useConnection();
  var [ images, setImages ] = useState<any[]>([]);

  const loadNfts = async(publicKey: PublicKey) => {
      var result = [];
      let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');


      let key = new PublicKey('HdDo3vBeaUqoBmYdZoEAftR9v2wrQC5hav1PynxmU6FZ')
      let response = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );
      console.log(response.value.length)
      let arr = response.value.splice(0, 100)

      let mints = await Promise.all(arr
        .filter(accInfo => accInfo.account.data.parsed.info.tokenAmount.uiAmount !== 0)
        .map(accInfo => getMetadataAccount(accInfo.account.data.parsed.info.mint))
      );

      let mintPubkeys = mints.map(m => new PublicKey(m));

      let multipleAccounts = await connection.getMultipleAccountsInfo(mintPubkeys);

      let nftMetadata = multipleAccounts.filter(account => account !== null).map(account => decodeMetadata(account!.data));
      console.log(nftMetadata)
      for (let bae of nftMetadata) {
        if (bae) {
          var resp = await axios.get(bae.data?.uri) 
          var data = resp.data
          if (data.image)
            result.push(data.image)
        }
      }
      return result
  }

  useEffect(() => {
    if (wallet !== undefined && wallet.publicKey)
    (async () => {
      if (wallet.publicKey)
        setImages(await loadNfts(wallet.publicKey))
    })()
  }, [ connected ])

  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return ( 
    <div>
      <Button type="primary" onClick={showModal}>
        Open Modal
      </Button>
      <Modal title="Basic Modal" visible={isModalVisible} onOk={handleOk} width={1600} onCancel={handleCancel}> 
        <ScrollMenu scrollContainerClassName='scroller'>
          {images && images.map((elem, index) => <img key={index} style={{ height:'250px', width:'250px', padding:'25px'}} src={elem}/>)}

        </ScrollMenu>
      </Modal>
    </div>)

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
  const [ playerStateData, setPlayerStateData ] = useState<Buffer|undefined>(undefined);
  const [ game, setGame ] = useState<Game|undefined>(undefined);
  const [ gameState, setGameState ] = useState<GameState|undefined>(undefined);
  const [ gamePublicKey, setGamePublicKey ] = useState<PublicKey|undefined>(undefined)



  const playerStatePublicKey = new PublicKey('zpqYQ1gk6vwuWydhUbdKXXdviH95RXsCY8CW8invAfg')

  useEffect(() => {
    (async () => {
      let stateInfo = await connection.getAccountInfo(playerStatePublicKey)
      if (stateInfo)
        setPlayerStateData(stateInfo.data)
    })()

  }, [])

  useEffect(() => {
    if (playerStateData) {
      var reader = new BinaryReader(playerStateData)
      let playerPublicKey = reader.readPubkey()
      let isInGame = reader.readBoolean()
      let gameKey = reader.readPubkey()
      if (isInGame) {
        setGamePublicKey(gameKey)
      }  
    }
  }, [ playerStateData ])


  useEffect(() => {
    if (!gamePublicKey)
      return
    (async () => {
      let gameInfo = await connection.getAccountInfo(gamePublicKey)
      if (gameInfo?.data) {
        connection.onAccountChange(gamePublicKey, (accountInfo) => {
          console.log('onAccountChange')
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
    if (!game)
      return
    (async () => {
      console.log('loading gameState')
      let gameStateInfo = await connection.getAccountInfo(game.state)
      if (gameStateInfo?.data) {
        let project = await Project.get(connection, game.project)
        let constructedContent = await project.сonstructContent(connection)

        let state = new GameState()
        state.content = constructedContent
        let reader = new BinaryReader(gameStateInfo.data)
        state.read(reader)
        setGameState(state)
      }
    })()
  }, [ game ])

  useEffect(() => {
    if (!gameState)
      return
    unityGameContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gameState.toBoardData()));
  }, [ gameState ])

  const createPlayerState = async() => {
    if (!publicKey || wallet === undefined) {
      return;
    }
    var instructions = [];

    var stateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: 65, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(65, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: stateAccount.publicKey,
    })); 
    console.log(stateAccount.publicKey.toBase58())

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
      space: 200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: gameAccount.publicKey,
    }));

    let project = await Project.get(connection, projectPublicKey)
    let constructedContent = await project.сonstructContent(connection)
    let gm = new GameState(constructedContent)

    let writer = new BinaryWriter()
    let gameBuffer = gm.write(writer)
    let buf = writer.buf.slice(0, writer.length)
    var gameStateAccount = new Account()
    instructions.push(SystemProgram.createAccount({
      programId: programId,
      space: buf.length,
      lamports: await connection.getMinimumBalanceForRentExemption(buf.length, 'singleGossip'),
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
    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: gameAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: playerStatePublicKey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([1]),
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
        buf,
      ])
    }));

    sendTransaction(connection, wallet, instructions, [ gameAccount, gameStateAccount ])
  }

  unityGameContext.on("OnUnityLoaded", async () => {
    if (!gameState)
      return;
    var data = { IsConnected: true };
    unityGameContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));


    unityGameContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(gameState.extractContent()));
    unityGameContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(gameState.toBoardData()));
  });


  unityGameContext.on("LogAction", async (log: string) => {
    if (!gameState || !game || !gamePublicKey)
      return;
    if (!publicKey || wallet === undefined) 
      return;

    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        let writer = new BinaryWriter()
        gameState.useCard(logEntry.data, logEntry.playerId)
        gameState.write(writer)

        let step = game.step
        console.log(step)
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
    <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityGameContext} />
  :
    <ConnectButton/>    
  );
};
