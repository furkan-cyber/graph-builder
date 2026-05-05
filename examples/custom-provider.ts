import { graphBuilder, type GraphBuilderProvider } from "../src/index.js";

type DbRowDescriptor = {
  id: string;
};

const rows = [
  {
    id: "1",
    title: "Customers",
    body: "# Customers\n\nCustomer profiles link to the billing system.",
    collection: "crm"
  },
  {
    id: "2",
    title: "Billing",
    body: "# Billing\n\nBilling syncs invoices and subscriptions.",
    collection: "finance"
  }
];

const provider: GraphBuilderProvider<DbRowDescriptor> = {
  name: "db-provider",
  async *list() {
    for (const row of rows) {
      yield { id: row.id };
    }
  },
  async read(descriptor) {
    const row = rows.find((entry) => entry.id === descriptor.id);
    if (!row) {
      throw new Error(`Missing row ${descriptor.id}`);
    }
    return {
      id: `db:${row.id}`,
      title: row.title,
      text: row.body,
      sourceType: "db-row",
      metadata: {
        collection: row.collection
      },
      storageRef: {
        provider: "db",
        namespace: row.collection,
        physicalId: row.id,
        logicalPath: `${row.collection}/${row.title}`
      }
    };
  }
};

const result = await graphBuilder(provider);

console.log("Communities:", result.analysis.communities);
console.log("Neighbors of Customers:", result.query.neighbors("Customers"));