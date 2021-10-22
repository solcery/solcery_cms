import { PublicKey, Account, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import EventEmitter from "eventemitter3";
import React, { useContext, useState, useEffect } from "react";
import { Button, Modal, Input, Row, Col } from "antd";
import { useConnection, sendTransaction } from "./connection";
import { useWallet, WalletProvider } from "./wallet";
import { Project } from "../solcery/classes";
import Cookies from 'universal-cookie';
import { BinaryReader } from "borsh";

import 'animate.css';

const programId = new PublicKey("GN1p6pe6m7rdK3re2TayqJyQtJUme1EnCLyYrTAArYRR");
const STATE_ACCOUNT_SEED = 'solcery_player_state_dev_net5';
const STATE_ACCOUNT_SIZE = 65;

type PlayerState = {
	playerPublicKey: PublicKey,
	playerStatePublicKey: PublicKey,
	gamePublicKey: PublicKey | undefined,
}

interface PlayerContextInterface {
	player: PlayerState | undefined,
}

const PlayerContext = React.createContext<PlayerContextInterface>({ 
	player: undefined
});

export function PlayerProvider({ children = null as any }) {
	
	var cookies = new Cookies()
	const connection = useConnection()
	const { wallet, publicKey, connected, connect } = useWallet();
	const [ player, setPlayer ] = useState<PlayerState | undefined>(undefined)
	const [ stateAccountPublicKey, setStateAccountPublicKey ] = useState<PublicKey|undefined>(undefined)

	const loadPlayerState = (playerStatePublicKey: PublicKey, data: Buffer) => {
		let reader = new BinaryReader(data)
		setPlayer({
			playerPublicKey: reader.readPubkey(),
			playerStatePublicKey: playerStatePublicKey,
			gamePublicKey: reader.readBoolean() ? reader.readPubkey() : undefined,
		})
	}

	const createPlayerState = async() => {
    if (!publicKey || wallet === undefined ) return;
    
    var instructions = [];
    const playerStatePublicKey = await PublicKey.createWithSeed(
      publicKey,
      STATE_ACCOUNT_SEED,
      programId,
    );
    
    instructions.push(SystemProgram.createAccountWithSeed({
      fromPubkey: publicKey,
      basePubkey: publicKey,
      seed: STATE_ACCOUNT_SEED,
      newAccountPubkey: playerStatePublicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(STATE_ACCOUNT_SIZE, 'singleGossip'),
      space: STATE_ACCOUNT_SIZE,
      programId: programId,
    }));

    instructions.push(new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: false },
        { pubkey: playerStatePublicKey, isSigner: false, isWritable: true }
      ],
      programId: programId,
      data: Buffer.from([5]),
    }));
    sendTransaction(connection, wallet, instructions, [])
  }



	useEffect(() => {
		if (connected && publicKey) {
			(async () => {
				const playerStatePublicKey = await PublicKey.createWithSeed(
		      publicKey,
		      STATE_ACCOUNT_SEED,
		      programId,
		    );
		    var playerStateAccountInfo = await connection.getAccountInfo(playerStatePublicKey)
		    if (playerStateAccountInfo) {
		    	loadPlayerState(playerStatePublicKey, playerStateAccountInfo.data)
		    } 
		    connection.onAccountChange(playerStatePublicKey, (accountInfo) => {
          loadPlayerState(playerStatePublicKey, accountInfo.data)
        })
			})()
		}
	}, [ connected ])

	if (player)
		return (
			<PlayerContext.Provider
			value={{
				player: player
			}}
			>
			{children}
			</PlayerContext.Provider>
		);
	return (
		<div className="login_page">
      <video autoPlay muted loop className='bgvideo'>
        <source src="/gameplay.mp4" type="video/mp4"/>
      </video>
      <Row align='middle'>
      	<Col span={24}>
         	<img className="solcery_logo" src="/logo.png"/>
      	</Col>
        <Col offset={8} span={8}>
          <img className="solcery_text" src="/solcery.png"/>
          { !connected ? 
          	<div className="btn-container animate__animated animate__pulse">
	            <a onClick={connect} className="btn effect01"><span>Connect</span></a>
	          </div>
          	:
          	<div>
		          <div className="btn-container">
		            <a onClick={createPlayerState} className="btn effect01"><span>Create account</span></a>
		          </div>
	          	<p className="animate__animated animate__headShake" 
	          		 style={{ marginTop: "20px", fontSize: "1.4em", color: "orange" }}>No account found. Create one?</p>
	          </div>
          }
        </Col>
      </Row>
    </div>
	);
}

export function usePlayer() {
 	const { player } = useContext(PlayerContext);
	return { player, playerStatePublicKey: player?.playerStatePublicKey, gamePublicKey: player?.gamePublicKey }
}
