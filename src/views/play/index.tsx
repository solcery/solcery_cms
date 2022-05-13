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
    console.log('TEST')
    console.log(constructedContent)
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
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(client_package));
  }

  const onCardAttrChange = (cardId: number, attrName: string, value: number) => {
    gameState.objects.get(cardId).attrs[attrName] = value;
    sendGameState(gameState)
    setStep(step + 1)
  }

  unityPlayContext.on("OnUnityLoaded", async () => {
    let content = gameState.content.toJson()
    unityPlayContext.send("ReactToUnity", "UpdateGameContent", content);
    sendGameState(gameState)
  });

  unityPlayContext.on("SendCommand", async (jsonData: string) => {
    let command = JSON.parse(jsonData)
    let clientPackage = {
      states: gameState.playerCommand(command)
    }
    console.log(clientPackage)
    unityPlayContext.send("ReactToUnity", "UpdateGameState", JSON.stringify(clientPackage));
    setStep(step + 1)
  });

  console.log(gameState)
  if (!gameState || !gameState.objects) return (<div></div>)

  return (
    <div style={{ width: '100%' }}>
      <Unity tabIndex={3} style={{ width: '100%' }} unityContext={unityPlayContext} />
    </div>    
  );
};
