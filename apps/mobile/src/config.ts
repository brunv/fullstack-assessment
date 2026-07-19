export const GRAPHQL_URL =
  process.env.EXPO_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql/";

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export const SYNC_URL = `${API_BASE_URL}/sync/`;
