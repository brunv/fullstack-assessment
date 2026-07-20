import { gql } from "@apollo/client";

export type Status = "new" | "in_progress" | "complete";

export type PostJob = { id: string; title: string };

export type Post = {
  id: string;
  description: string;
  pictureUrl: string | null;
  pictureContentType: string;
  status: Status;
  createdAt: string;
  job?: PostJob;
};

export type Job = {
  id: string;
  title: string;
  status: Status;
  createdAt: string;
  posts: Post[];
};

export const JOBS_QUERY = gql`
  query Jobs {
    jobs {
      id
      title
      status
      createdAt
      posts {
        id
      }
    }
  }
`;
export type JobsQueryResult = { jobs: Job[] };

export const JOB_QUERY = gql`
  query Job($id: ID!) {
    job(id: $id) {
      id
      title
      status
      createdAt
      posts {
        id
        description
        pictureUrl
        pictureContentType
        status
        createdAt
      }
    }
  }
`;
export type JobQueryResult = { job: Job | null };
export type JobQueryVars = { id: string };

export const ALL_POSTS_QUERY = gql`
  query AllPosts {
    posts {
      id
      description
      pictureUrl
      pictureContentType
      status
      createdAt
      job {
        id
        title
      }
    }
  }
`;
export type AllPostsQueryResult = { posts: Post[] };

export const CREATE_JOB = gql`
  mutation CreateJob($title: String!) {
    createJob(title: $title) {
      job {
        id
        title
        status
        createdAt
        posts {
          id
        }
      }
    }
  }
`;
export type CreateJobResult = { createJob: { job: Job } };
export type CreateJobVars = { title: string };

export const UPDATE_JOB_STATUS = gql`
  mutation UpdateJobStatus($id: ID!, $status: String!) {
    updateJobStatus(id: $id, status: $status) {
      job {
        id
        status
      }
    }
  }
`;
export type UpdateJobStatusVars = { id: string; status: Status };

export const UPDATE_POST_STATUS = gql`
  mutation UpdatePostStatus($id: ID!, $status: String!) {
    updatePostStatus(id: $id, status: $status) {
      post {
        id
        status
      }
    }
  }
`;
export type UpdatePostStatusVars = { id: string; status: Status };

export const DELETE_JOB = gql`
  mutation DeleteJob($id: ID!) {
    deleteJob(id: $id) {
      ok
    }
  }
`;
export type DeleteJobVars = { id: string };

export const CREATE_POST = gql`
  mutation CreatePost(
    $jobId: ID!
    $description: String
    $pictureKey: String
    $pictureContentType: String
  ) {
    createPost(
      jobId: $jobId
      description: $description
      pictureKey: $pictureKey
      pictureContentType: $pictureContentType
    ) {
      post {
        id
        description
        pictureUrl
        pictureContentType
        status
        createdAt
      }
    }
  }
`;
export type CreatePostVars = {
  jobId: string;
  description?: string;
  pictureKey?: string;
  pictureContentType?: string;
};

export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      ok
    }
  }
`;
export type DeletePostVars = { id: string };

export const CREATE_PRESIGNED_UPLOAD = gql`
  mutation CreatePresignedUpload($filename: String!, $contentType: String!) {
    createPresignedUpload(filename: $filename, contentType: $contentType) {
      uploadUrl
      key
    }
  }
`;
export type CreatePresignedUploadResult = {
  createPresignedUpload: { uploadUrl: string; key: string };
};
export type CreatePresignedUploadVars = { filename: string; contentType: string };
