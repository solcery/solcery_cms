import React, { useState, useEffect } from "react";
import { useConnection, sendTransaction } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import Unity, { UnityContext } from "react-unity-webgl";
import { Project } from "../../solcery/classes"
import { ConnectButton } from "../../components/ConnectButton"

import "./style.css"

import axios from 'axios'
import {decodeMetadata, getMetadataAccount} from "../../metaplex/metadata";
import {clusterApiUrl, Connection, PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";

export const StoreView = () => {



  const { connected, wallet, publicKey } = useWallet();
  const connection = useConnection();


return(
  connected ?
    <div className="l-container">
      <div className="b-game-card">
        <div className="b-game-card__cover">
          <img src="https://cdn.discordapp.com/attachments/863663744194183198/895676013814624276/Summoner_Logo.png"/>
        </div>
      </div>
      <div className="b-game-card">
        <div className="b-game-card__cover">
          <img src="https://cdn.discordapp.com/attachments/863663744194183198/895676013814624276/Summoner_Logo.png"/>
        </div>
      </div>
    </div>
  :
    <ConnectButton/>    
  );
};

