import React, { useCallback, useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import Unity, { UnityContext } from "react-unity-webgl";
import { Button, Layout, InputNumber, Collapse, Divider, Space, Input } from "antd";
import { applyBrick } from "../../solcery/types/brick";
import { GameState } from "../../solcery/game"
import { ConstructedContent } from "../../solcery/content"

import testGameContent from "./game_content_test.json"

import { BinaryWriter, BinaryReader } from "borsh";

import "./style.css"

const unityPlayContext = new UnityContext({
  loaderUrl: "new_game/WebGl.loader.js",
  dataUrl: "new_game/WebGl.data",
  frameworkUrl: "new_game/WebGl.framework.js",
  codeUrl: "new_game/WebGl.wasm",
  streamingAssetsUrl: "StreamingAssets",
})

export const PlayView = () => {

  const [ gameState, setGameState ] = useState<any>(undefined)
  const [ step, setStep ] = useState(0)

  useEffect(() => {
    let buffer = Buffer.from(testGameContent.data)
    var constructedContent = ConstructedContent.fromBuffer(buffer)
    let gameState = new GameState(constructedContent, [ 'core', 'tech demo', 'test buttons '])
    setGameState(gameState)
    return () => { 
      unityPlayContext.quitUnityInstance() 
    }
  }, [])
 
  const sendGameState = (gameState: any) => {
    let client_package = {
      states: [
        {
          id: 0,
          state_type: 0,
          value: gameState.toObject(),
        }
      ]
    }
    clientCommand('UpdateGameState', JSON.stringify(client_package));
  }

  function * stringChunk(s: string, maxBytes: number) {
    const SPACE_CODE = 32;
    let buf = Buffer.from(s);
    while (buf.length) {
      let i = buf.lastIndexOf(SPACE_CODE, maxBytes + 1);
      if (i < 0) i = buf.indexOf(SPACE_CODE, maxBytes);
      if (i < 0) i = buf.length;
      yield buf.slice(0, i).toString();
      buf = buf.slice(i + 1); 
    }
  }

  const clientCommand = (funcName: string, param: string) => {
    const USHORT_SIZE = 65536;
    const chunks = [...stringChunk(param, USHORT_SIZE)];

    for (let i = 0; i < chunks.length; i++) {
      let chunk_package = {
        count: chunks.length,
        index: i,
        value: chunks[i],
      }
      // console.log(`Web - sending package to Unity client [${funcName}]: ${JSON.stringify(chunk_package)}`);
      unityPlayContext.send('ReactToUnity', funcName, JSON.stringify(chunk_package))
    }
  }

  unityPlayContext.on("OnUnityLoaded", async () => {
    let content = gameState.content.toJson()
    clientCommand("UpdateGameContent", content)
    sendGameState(gameState)
  });

  unityPlayContext.on("SendCommand", async (jsonData: string) => {
    let command = JSON.parse(jsonData)
    let clientPackage = {
      states: gameState.playerCommand(command)
    }
    clientCommand('UpdateGameState', JSON.stringify(clientPackage));
    setStep(step + 1)
  });

  unityPlayContext.on("LogAction", async (log: string) => {
    var logToApply = JSON.parse(log)
    for (let logEntry of logToApply.Steps) {
      if (logEntry.actionType == 0)
      {
        gameState.useCard(logEntry.data, logEntry.playerId)
        sendGameState(gameState)
        setStep(step + 1)
      }
    }
  });

  if (!gameState || !gameState.objects) return (<div></div>)

  return (
    <div style={{ width: '100%' }}>
      <Unity tabIndex={3} style={{ width: '100%' }} unityContext={unityPlayContext} />
    </div>    
  );
};
