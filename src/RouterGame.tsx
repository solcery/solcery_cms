import { HashRouter, Route, Switch, Link } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { PlayerProvider } from "./contexts/player";
import { AppLayout } from "./components/Layout";
import { GameView, StoreView, SolitaryView } from "./views";

export function RouterGame() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AppLayout>
              <PlayerProvider>
                <Switch>
                  <Route exact path="/solitary" component={() => <SolitaryView/>} />
                  <Route exact path="/game/:gameId" component={() => <GameView />} />
                  <Route exact path="/" component={() => <StoreView/>} />
                </Switch>
              </PlayerProvider>
            </AppLayout>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
