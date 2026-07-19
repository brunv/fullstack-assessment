import { gql } from "@apollo/client";

export const CREATE_PRESIGNED_UPLOAD = gql`
  mutation CreatePresignedUpload($filename: String!, $contentType: String!) {
    createPresignedUpload(filename: $filename, contentType: $contentType) {
      uploadUrl
      key
    }
  }
`;
