import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { PlayerProvider } from "./contexts/player";
import { AppLayout } from "./components/Layout";
import { PlayView } from "./views";

export function RouterGame() {
  return (
    <>
      <HashRouter basename={"/"}>
        <AppLayout>
          <Switch>
            <Route exact path="/" component={() => <PlayView/>} />
          </Switch>
        </AppLayout>
      </HashRouter>
    </>
  );
}
