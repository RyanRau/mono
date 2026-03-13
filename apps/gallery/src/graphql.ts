import { GraphQLClient, gql } from "graphql-request";
import nhost from "./nhost";

function getClient() {
  const session = nhost.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return new GraphQLClient(nhost.graphql.httpUrl, { headers });
}

export type Photo = {
  id: string;
  cdn_url: string;
  alt_text: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
};

const GET_PUBLIC_PHOTOS = gql`
  query GetPublicPhotos {
    photos(where: { is_public: { _eq: true } }, order_by: { created_at: desc }) {
      id
      cdn_url
      alt_text
      is_public
      user_id
      created_at
    }
  }
`;

const GET_ALL_PHOTOS = gql`
  query GetAllPhotos {
    photos(order_by: { created_at: desc }) {
      id
      cdn_url
      alt_text
      is_public
      user_id
      created_at
    }
  }
`;

const INSERT_PHOTO = gql`
  mutation InsertPhoto($cdn_url: String!, $alt_text: String!, $is_public: Boolean!) {
    insert_photos_one(object: { cdn_url: $cdn_url, alt_text: $alt_text, is_public: $is_public }) {
      id
    }
  }
`;

const UPDATE_PHOTO = gql`
  mutation UpdatePhoto($id: uuid!, $alt_text: String!, $is_public: Boolean!) {
    update_photos_by_pk(
      pk_columns: { id: $id }
      _set: { alt_text: $alt_text, is_public: $is_public }
    ) {
      id
    }
  }
`;

const DELETE_PHOTO = gql`
  mutation DeletePhoto($id: uuid!) {
    delete_photos_by_pk(id: $id) {
      id
    }
  }
`;

export async function fetchPublicPhotos(): Promise<Photo[]> {
  const client = getClient();
  const data = await client.request<{ photos: Photo[] }>(GET_PUBLIC_PHOTOS);
  return data.photos;
}

export async function fetchAllPhotos(): Promise<Photo[]> {
  const client = getClient();
  const data = await client.request<{ photos: Photo[] }>(GET_ALL_PHOTOS);
  return data.photos;
}

export async function insertPhoto(vars: {
  cdn_url: string;
  alt_text: string;
  is_public: boolean;
}): Promise<string> {
  const client = getClient();
  const data = await client.request<{ insert_photos_one: { id: string } }>(INSERT_PHOTO, vars);
  return data.insert_photos_one.id;
}

export async function updatePhoto(vars: {
  id: string;
  alt_text: string;
  is_public: boolean;
}): Promise<void> {
  const client = getClient();
  await client.request(UPDATE_PHOTO, vars);
}

export async function deletePhoto(id: string): Promise<void> {
  const client = getClient();
  await client.request(DELETE_PHOTO, { id });
}
