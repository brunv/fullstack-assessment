import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import { GRAPHQL_URL } from "./config";
import { fetchWithTimeout } from "./utils/fetchWithTimeout";

export const apolloClient = new ApolloClient({
  // A stalled request through the default fetch never settles (RN's fetch
  // has no built-in timeout) — that's fatal specifically for the sync path
  // (src/db/sync.ts's createPresignedUpload mutation), where a hung request
  // leaves syncDatabase()'s promise pending forever and the "syncing"
  // status every list screen's pull-to-refresh is bound to stuck
  // indefinitely. Applying it here covers every Apollo call, not just that
  // one.
  link: new HttpLink({ uri: GRAPHQL_URL, fetch: fetchWithTimeout }),
  cache: new InMemoryCache(),
});
