import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import AllPostsScreen from "../screens/AllPostsScreen";
import PostDetailsScreen from "../screens/PostDetailsScreen";
import { colors } from "../theme";
import type { PostsStackParamList } from "./types";

const Stack = createNativeStackNavigator<PostsStackParamList>();

export default function PostsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="AllPosts" component={AllPostsScreen} options={{ title: "Posts" }} />
      <Stack.Screen name="PostDetails" component={PostDetailsScreen} options={{ title: "Post" }} />
    </Stack.Navigator>
  );
}
