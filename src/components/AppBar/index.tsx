import React from "react";
import { Button, Popover } from "antd";
import { useWallet } from "../../contexts/wallet";
import { CurrentUserBadge } from "../CurrentUserBadge";
import { SettingOutlined } from "@ant-design/icons";
import { Settings } from "../Settings";
import { LABELS } from "../../constants";
import { ConnectButton } from "../ConnectButton";
import { SolceryMenu } from "../SolceryMenu";

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const { connected } = useWallet();
  const TopBar = (
    <div tabIndex = {1} className="App-Bar-right">
      {connected && (
        <CurrentUserBadge />
      )}
      {!connected && (
        <ConnectButton />
      )}
      {props.right}
    </div>
  );

  return TopBar;
};
