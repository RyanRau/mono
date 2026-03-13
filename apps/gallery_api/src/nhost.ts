const subdomain = process.env.NHOST_SUBDOMAIN!;
const region = process.env.NHOST_REGION!;
const adminSecret = process.env.NHOST_ADMIN_SECRET!;

const graphqlUrl = `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`;

export type Photo = {
  id: string;
  cdn_url: string;
  alt_text: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
};

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

export async function fetchPublicPhotos(): Promise<Photo[]> {
  const data = await gql<{ photos: Photo[] }>(`
    query {
      photos(where: { is_public: { _eq: true } }, order_by: { created_at: desc }) {
        id cdn_url alt_text is_public user_id created_at
      }
    }
  `);
  return data.photos;
}

export async function fetchAllPhotos(): Promise<Photo[]> {
  const data = await gql<{ photos: Photo[] }>(`
    query {
      photos(order_by: { created_at: desc }) {
        id cdn_url alt_text is_public user_id created_at
      }
    }
  `);
  return data.photos;
}

export async function insertPhoto(vars: {
  cdn_url: string;
  alt_text: string;
  is_public: boolean;
  user_id: string;
}): Promise<Photo> {
  const data = await gql<{ insert_photos_one: Photo }>(
    `mutation ($cdn_url: String!, $alt_text: String!, $is_public: Boolean!, $user_id: uuid!) {
      insert_photos_one(object: {
        cdn_url: $cdn_url, alt_text: $alt_text, is_public: $is_public, user_id: $user_id
      }) {
        id cdn_url alt_text is_public user_id created_at
      }
    }`,
    vars
  );
  return data.insert_photos_one;
}

export async function updatePhoto(vars: {
  id: string;
  alt_text: string;
  is_public: boolean;
}): Promise<Photo> {
  const data = await gql<{ update_photos_by_pk: Photo }>(
    `mutation ($id: uuid!, $alt_text: String!, $is_public: Boolean!) {
      update_photos_by_pk(pk_columns: { id: $id }, _set: { alt_text: $alt_text, is_public: $is_public }) {
        id cdn_url alt_text is_public user_id created_at
      }
    }`,
    vars
  );
  return data.update_photos_by_pk;
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  const data = await gql<{ photos_by_pk: Photo | null }>(
    `query ($id: uuid!) {
      photos_by_pk(id: $id) {
        id cdn_url alt_text is_public user_id created_at
      }
    }`,
    { id }
  );
  return data.photos_by_pk;
}

export async function deletePhotoById(id: string): Promise<Photo | null> {
  const data = await gql<{ delete_photos_by_pk: Photo | null }>(
    `mutation ($id: uuid!) {
      delete_photos_by_pk(id: $id) {
        id cdn_url alt_text is_public user_id created_at
      }
    }`,
    { id }
  );
  return data.delete_photos_by_pk;
}
