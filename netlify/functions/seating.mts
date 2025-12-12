import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
  const sql = neon();

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS seating_plans (
      id VARCHAR(36) PRIMARY KEY,
      tables JSONB NOT NULL,
      guests JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  if (req.method === "POST") {
    try {
      const { id, tables, guests } = await req.json();

      if (!id || !tables || !guests) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: id, tables, guests" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Insert or update the seating plan
      await sql`
        INSERT INTO seating_plans (id, tables, guests, updated_at)
        VALUES (${id}, ${JSON.stringify(tables)}, ${JSON.stringify(guests)}, CURRENT_TIMESTAMP)
        ON CONFLICT (id)
        DO UPDATE SET
          tables = ${JSON.stringify(tables)},
          guests = ${JSON.stringify(guests)},
          updated_at = CURRENT_TIMESTAMP
      `;

      return new Response(
        JSON.stringify({ success: true, id }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error saving seating plan:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save seating plan", details: String(error) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing required parameter: id" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const results = await sql`
        SELECT id, tables, guests, created_at, updated_at
        FROM seating_plans
        WHERE id = ${id}
      `;

      if (results.length === 0) {
        return new Response(
          JSON.stringify({ error: "Seating plan not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const plan = results[0];

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: plan.id,
            tables: plan.tables,
            guests: plan.guests,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error getting seating plan:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get seating plan", details: String(error) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/seating",
};
