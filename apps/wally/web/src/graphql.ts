import { GraphQLClient, gql } from "graphql-request";
import nhost from "./nhost";

function getClient() {
  const session = nhost.auth.getSession();
  return new GraphQLClient(nhost.graphql.httpUrl, {
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });
}

export type PreferredProduct = {
  id: string;
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
  created_at: string;
};

const GET_PREFERRED_PRODUCTS = gql`
  query GetPreferredProducts {
    preferred_products(order_by: { created_at: desc }) {
      id
      label
      search_terms
      walmart_product_id
      notes
      created_at
    }
  }
`;

const INSERT_PREFERRED_PRODUCT = gql`
  mutation InsertPreferredProduct(
    $label: String!
    $search_terms: [String!]!
    $walmart_product_id: String!
    $notes: String
  ) {
    insert_preferred_products_one(
      object: {
        label: $label
        search_terms: $search_terms
        walmart_product_id: $walmart_product_id
        notes: $notes
      }
    ) {
      id
    }
  }
`;

const UPDATE_PREFERRED_PRODUCT = gql`
  mutation UpdatePreferredProduct(
    $id: uuid!
    $label: String!
    $search_terms: [String!]!
    $walmart_product_id: String!
    $notes: String
  ) {
    update_preferred_products_by_pk(
      pk_columns: { id: $id }
      _set: {
        label: $label
        search_terms: $search_terms
        walmart_product_id: $walmart_product_id
        notes: $notes
      }
    ) {
      id
    }
  }
`;

const DELETE_PREFERRED_PRODUCT = gql`
  mutation DeletePreferredProduct($id: uuid!) {
    delete_preferred_products_by_pk(id: $id) {
      id
    }
  }
`;

export async function fetchProducts(): Promise<PreferredProduct[]> {
  const client = getClient();
  const data = await client.request<{ preferred_products: PreferredProduct[] }>(
    GET_PREFERRED_PRODUCTS
  );
  return data.preferred_products;
}

export async function insertProduct(vars: {
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
}): Promise<string> {
  const client = getClient();
  const data = await client.request<{
    insert_preferred_products_one: { id: string };
  }>(INSERT_PREFERRED_PRODUCT, vars);
  return data.insert_preferred_products_one.id;
}

export async function updateProduct(vars: {
  id: string;
  label: string;
  search_terms: string[];
  walmart_product_id: string;
  notes: string | null;
}): Promise<void> {
  const client = getClient();
  await client.request(UPDATE_PREFERRED_PRODUCT, vars);
}

export async function deleteProduct(id: string): Promise<void> {
  const client = getClient();
  await client.request(DELETE_PREFERRED_PRODUCT, { id });
}
