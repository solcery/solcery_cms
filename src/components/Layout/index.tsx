import React from "react";
import "./../../App.less";
import { Layout } from "antd";
import { Link } from "react-router-dom";

import { LABELS } from "../../constants";
import { AppBar } from "../AppBar";
import { SolceryMenu } from "../SolceryMenu"

const { Header, Content } = Layout;

export const AppLayout = React.memo((props: any) => {
  return (
    <div className="App wormhole-bg">
      <Layout>
        <Header className="App-Bar">
          <SolceryMenu/>
          <Link to="/">
            <div className="app-title">
              <h2>SOLCERY</h2>
            </div>
          </Link>
          <AppBar />
        </Header>
        <Content style={{ padding: "0 0px" }}>{props.children}</Content>
      </Layout>
    </div>
  );
});
