import { PublicKey } from "@solana/web3.js";
import EventEmitter from "eventemitter3";
import React, {
  useContext,
  useState,
  useEffect,
} from "react";
import { Button, Modal, Input, Spin } from "antd";
import { ConnectButton } from "../components/ConnectButton";

import { SolceryMenu } from "../components/SolceryMenu";
import { useConnection } from "./connection";
import { useWallet, WalletProvider } from "./wallet";

import { Project as Prj } from '../content/project'

import Cookies from 'universal-cookie';

interface ProjectContextInterface {
  project: any | undefined;
  userPrefs: any | undefined;
}

const ProjectContext = React.createContext<ProjectContextInterface>({ 
	project: undefined,
	userPrefs: undefined,
});

export function ProjectProvider({ children = null as any }) {
	
	var cookies = new Cookies()
	const connection = useConnection()
	const { connected, publicKey } = useWallet();
	const [ projectKey, setProjectKey ] = useState(new PublicKey('J2TDJcbUXev6SNJMqq5QAtvxsZdHDyjwnQdLSqJLL2kk'));
	const [ project, setProject ] = useState<any>(undefined)
	const [ isLoading, setIsLoading ] = useState(false)
	const [ userPrefs, setUserPrefs ] = useState<any>({})

	const SESSION_LENGTH = 86400 * 30 * 1000;


	const login = async () => {
		if (!projectKey) return;
		setIsLoading(true)
		let prj = window.root.create(Prj, { id: projectKey, pubkey: new PublicKey('J2TDJcbUXev6SNJMqq5QAtvxsZdHDyjwnQdLSqJLL2kk') })
		setProject(await prj.await(connection))
		setIsLoading(false)
	}
	useEffect(() => {
		login()
	})

	if (project)
		return (
			<ProjectContext.Provider
				value={{ project, userPrefs }}
			>
			<SolceryMenu/>
			{children}
			</ProjectContext.Provider>
		);

	return (
		<div>
		{children}
		</div>
	);
}

export function useProject() {
 	const { project, userPrefs } = useContext(ProjectContext);
	return { project, userPrefs }
}
