import React from "react";
import "./../../App.less";
import { Layout } from "antd";
import { Link } from "react-router-dom";

import { LABELS } from "../../constants";
import { AppBar } from "../AppBar";

const { Header, Content } = Layout;

export const AppLayout = React.memo((props: any) => {
  return (
    <div className="App wormhole-bg">
      {props.children}
    </div>
  );
});
