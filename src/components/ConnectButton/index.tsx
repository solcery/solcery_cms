import { Button, Dropdown, Menu } from "antd";
import { ButtonProps } from "antd/lib/button";
import React, { useCallback } from "react";
import { useWallet } from "../../contexts/wallet";
import { sendTransaction, useConnection } from "../../contexts/connection";
import { PublicKey } from "@solana/web3.js";

export interface ConnectButtonProps
  extends ButtonProps,
  React.RefAttributes<HTMLElement> {
  allowWalletChange?: boolean;
}

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export const ConnectButton = (props: ConnectButtonProps) => {
  const { wallet, connected, connect, select, provider } = useWallet();
  const { onClick, children, disabled, allowWalletChange, ...rest } = props;

  var connection = useConnection();

  const menu = (
    <Menu>
      <Menu.Item key="3" onClick={select}>
        Change Wallet
      </Menu.Item>
    </Menu>
  );
  return (
    <Dropdown.Button
      onClick={connect}
      disabled={connected && disabled}
      overlay={menu}
    >
      Connect
    </Dropdown.Button>
  );
};
