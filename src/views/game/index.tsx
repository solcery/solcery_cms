import React, { useCallback, useState, useEffect } from "react";
import { useConnection, sendTransaction} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { useParams } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Game } from "../../solcery/game"
import { Project } from "../../solcery/classes"
import { Button } from 'antd';

import axios from 'axios'
import {decodeMetadata, getMetadataAccount} from "../../metaplex/metadata";
import {clusterApiUrl, Connection, PublicKey} from "@solana/web3.js";

const {TOKEN_PROGRAM_ID} = require('@solana/spl-token');

const unityContext = new UnityContext({
  loaderUrl: "game/monkeys_1.loader.js",
  dataUrl: "game/monkeys_1.data",
  frameworkUrl: "game/monkeys_1.framework.js",
  codeUrl: "game/monkeys_1.wasm",
})

type GameViewParams = {
  gameId: string;
};


export const GameView = () => {

  const loadJumma = async() => {
      var result = [];
      //BEhYyLdgr8E2iP8UiLGKk9XhA7cteJN2kSymD7Rfp8bV

      //HdDo3vBeaUqoBmYdZoEAftR9v2wrQC5hav1PynxmU6FZ
      //9kXLhvDcWc4wzuapQpWkKVnJ8wKVhEDomwoFxkn58nfX

      //e82TbfCLbPdhDRm7EE7fL3h7WHtNMyF73XQtVcLNS1c
      let publicKey = new PublicKey('9kXLhvDcWc4wzuapQpWkKVnJ8wKVhEDomwoFxkn58nfX');
      let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

      let response = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );
      // response.value.splice(0, response.value.length - 20)

      let mints = await Promise.all(response.value
        .filter(accInfo => accInfo.account.data.parsed.info.tokenAmount.uiAmount !== 0)
        .map(accInfo => getMetadataAccount(accInfo.account.data.parsed.info.mint))
      );

      let mintPubkeys = mints.map(m => new PublicKey(m));

      let multipleAccounts = await connection.getMultipleAccountsInfo(mintPubkeys);

      let nftMetadata = multipleAccounts.filter(account => account !== null).map(account => decodeMetadata(account!.data));

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


  const { gameId } = useParams<GameViewParams>();
  const connection = useConnection();
  var [ game, setGame ] = useState<any>(undefined);
  var [ images, setImages ] = useState<any[]>([]);

  const load = async() => {
    // let cnn = new Connection("http://127.0.0.1:8899", "confirmed");
    // let prj = await Project.get(cnn, new PublicKey(gameId))
    // var constructedContent = await constructContent(prj, connection)
    // setGame(new Game(constructedContent))

  }

  const ld = async() => {
    console.log('ld')
    var res = await loadJumma()
    console.log(res)
    setImages(res)
  }


  useEffect(() => {
    load()
  }, [])


  unityContext.on("OnUnityLoaded", async () => {

    var data = { IsConnected: true };
    unityContext.send("ReactToUnity", "SetWalletConnected", JSON.stringify(data));

    unityContext.send("ReactToUnity", "UpdateGameContent", JSON.stringify(game.extractContent()));
    unityContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(game.toBoardData()));
  });


  unityContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        game.useCard(logEntry.data, logEntry.playerId)
        unityContext.send("ReactToUnity", "UpdateBoard", JSON.stringify(game.toBoardData()));
      }
    }
  });

  return ( 
    <div>
      {images && images.map((elem, index) => <img key={index} style={{ height:'150px', width:'150px'}} src={elem}/>)}
      <Button onClick={ld}>Load</Button>
      {//game && <Unity tabIndex={3} style={{ width: '100%', height: '100%' }} unityContext={unityContext} />
    }
      
    </div>
  );
};
