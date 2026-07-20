export type PostDetailsParams = { postId: string };

export type HomeStackParamList = {
  Home: undefined;
  JobDetails: { jobId: string; jobTitle: string };
  PostDetails: PostDetailsParams;
};

export type PostsStackParamList = {
  AllPosts: undefined;
  PostDetails: PostDetailsParams;
};

export type RootTabParamList = {
  HomeTab: undefined;
  PostsTab: undefined;
};
