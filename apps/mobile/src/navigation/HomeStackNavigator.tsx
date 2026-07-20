import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import HomeScreen from "../screens/HomeScreen";
import JobDetailsScreen from "../screens/JobDetailsScreen";
import PostDetailsScreen from "../screens/PostDetailsScreen";
import { colors } from "../theme";
import type { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Jobs" }} />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={({ route }) => ({ title: route.params.jobTitle })}
      />
      <Stack.Screen name="PostDetails" component={PostDetailsScreen} options={{ title: "Post" }} />
    </Stack.Navigator>
  );
}
