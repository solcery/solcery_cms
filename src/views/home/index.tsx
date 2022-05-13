import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useProject } from "../../contexts/project";
import { useWallet } from "../../contexts/wallet";
import { LAMPORTS_PER_SOL, Account, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { BinaryWriter, BinaryReader } from "borsh";
import { programId } from "../../solcery/engine"
import { Project, TemplateData, SolcerySchema, Storage} from "../../solcery/classes"
import { useHistory } from "react-router-dom";
import { Button, Divider } from "antd";
import { ConstructedContent, ConstructedObject, ConstructedTemplate, ConstructedObjects } from "../../solcery/content"
import { GameState } from "../../solcery/game"
import { DownloadOutlined } from '@ant-design/icons';

export const HomeView = () => {


  const connection = useConnection();
  const { wallet, publicKey } = useWallet();
  const history = useHistory();
  const { project, userPrefs } = useProject();
  const [ constructedContent, setConstructedContent ] = useState<any>(undefined)
  const [ constructedContentBinary, setConstructedContentBinary ] = useState<any>(undefined)
  const [ constructedState, setConstructedState ] = useState<any>(undefined)

  const downloadJsonFile = (name: string, data: string) => {
    const element = document.createElement("a");
    const file = new Blob([data], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = name;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  }

  const airdrop = async () => {
    if (!publicKey)
      return
    connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL * 1)
  }

  useEffect(() => {
    if (!project) return;
    let constructed = project.construct();
    setConstructedContent(constructed.toJson());
    setConstructedContentBinary(constructed.toBuffer())

    let gameState = new GameState(constructed, userPrefs.layoutPresets);
    let constructedState = {
      states: [
        {
          id: 0,
          state_type: 0,
          value: gameState.toObject(),
        }
      ]
    }
    setConstructedState(JSON.stringify(constructedState, null, 2));
  }, [ project, userPrefs ])

  const constructContent = async () => {
    // let writer = new BinaryWriter()
    // let gameStateBuf = gameState.toBuffer()

    // var gameStateAccount = new Account()
    // var createGameStateAccountIx = SystemProgram.createAccount({
    //   programId: programId,
    //   space: gameStateBuf.length, // TODO
    //   lamports: await connection.getMinimumBalanceForRentExemption(gameStateBuf.length, 'singleGossip'),
    //   fromPubkey: wallet.publicKey,
    //   newAccountPubkey: gameStateAccount.publicKey,
    // });

    // constructed.get('projectSettings')[0].gameStateAccount = gameStateAccount.publicKey.toBase58() // TODO: remove hardcode, publish
    
    // // rawsetting gameStateAccount
    // // 5ryw6zJjY7VqUetcPhFEpYUzLsQSEntMNhKgiWtCwJSY
    // let gameStateAccountKey = gameStateAccount.publicKey.toBase58() 
    // let projectSettings = constructed.templates.get("projectSettings")
    // if (projectSettings) {
    //   for (let projectSetting of projectSettings.objects.raw.values()) {
    //     projectSetting.data.set(13, gameStateAccountKey)
    //   }
    // }
    // constructed.write(writer)
    // let contentBuf = writer.buf.slice(0, writer.length)
    // let readContent = ConstructedContent.read(new BinaryReader(contentBuf))

    // var contentAccount = new Account()
    // var createContentAccountIx = SystemProgram.createAccount({
    //   programId: programId,
    //   space: contentBuf.length, // TODO
    //   lamports: await connection.getMinimumBalanceForRentExemption(contentBuf.length, 'singleGossip'),
    //   fromPubkey: wallet.publicKey,
    //   newAccountPubkey: contentAccount.publicKey,
    // });


    // await sendTransaction(connection, wallet, [createContentAccountIx, createGameStateAccountIx], [contentAccount, gameStateAccount]).then(async () => {
    //   await setAccountData(contentAccount.publicKey, contentBuf)
    //   await setAccountData(gameStateAccount.publicKey, gameStateBuf)
    //   console.log('CONSTRUCTED!')
    //   console.log('Content account: ' + contentAccount.publicKey.toBase58())
    //   console.log('JSON: ' + constructed.toJson())
    // })
  }

  const createTemplate = async () => {
    if (!publicKey) 
      return;
    if (wallet === undefined) 
      return;
    if (!project)
      return;
    

    var accounts = [];
    var instructions = []
    var templateAccount = new Account();
    var createTemplateAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: templateAccount.publicKey,
    });
    accounts.push(templateAccount);
    instructions.push(createTemplateAccountIx);

    var storageAccount = new Account();
    var createStorageAccountIx = SystemProgram.createAccount({
      programId: programId,
      space: 3200, // TODO
      lamports: await connection.getMinimumBalanceForRentExemption(3200, 'singleGossip'),
      fromPubkey: publicKey,
      newAccountPubkey: storageAccount.publicKey,
    });
    accounts.push(storageAccount);
    instructions.push(createStorageAccountIx);


    const createTemplateIx = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: project.pubkey, isSigner: false, isWritable: true },
        { pubkey: templateAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: storageAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: project.templateStorage.pubkey, isSigner: false, isWritable: true },
      ],
      programId: programId,
      data: Buffer.from([0, 0]),
    });
    instructions.push(createTemplateIx);
    await sendTransaction(connection, wallet, instructions, accounts).then(() => {
      history.push("/template/" + templateAccount.publicKey);
    })
  }

  let contentName = 'Content';
  if (userPrefs && userPrefs.layoutPresets) {
    contentName = `Content [ ${ userPrefs.layoutPresets.join(', ') } ]`;
  }
  return (
    <div>
      <Divider/>
      <h2>{ contentName }</h2>
      {constructedContent && 
        <Button 
          icon={<DownloadOutlined/>}
          onClick={() => { downloadJsonFile('game_content.json', constructedContent) }}>
          game_content.json
        </Button>}
      {constructedState && 
        <Button 
          icon={<DownloadOutlined/>}
          onClick={() => { downloadJsonFile('game_state.json', constructedState) }}>
          game_state.json
        </Button>}
      {constructedContentBinary && 
        <Button 
          icon={<DownloadOutlined/>}
          onClick={() => { downloadJsonFile('game_content_binary.json', constructedContentBinary) }}>
          game_content_binary.json
        </Button>}
      
      <Divider/>
      <h2>Utils</h2>
      <Button onClick = { createTemplate }>NEW TEMPLATE</Button>
      <Button onClick = { airdrop }>Airdrop</Button>
    </div>
  );
};
