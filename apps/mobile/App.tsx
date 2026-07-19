import { ApolloProvider } from "@apollo/client";
import { DatabaseProvider } from "@nozbe/watermelondb/react";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { apolloClient } from "./src/apollo";
import { database } from "./src/db";
import RootNavigator from "./src/navigation/RootNavigator";
import { SyncProvider } from "./src/sync/SyncContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <DatabaseProvider database={database}>
          <SyncProvider>
            <StatusBar style="auto" />
            <RootNavigator />
            <Toast />
          </SyncProvider>
        </DatabaseProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
