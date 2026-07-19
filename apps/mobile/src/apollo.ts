import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import { GRAPHQL_URL } from "./config";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_URL }),
  cache: new InMemoryCache(),
});
