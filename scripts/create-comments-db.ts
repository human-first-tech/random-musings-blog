import { Client } from "@notionhq/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PARENT_PAGE_ID = "34e44c75070f811d954bd4ec7a5d23d5";

async function main() {
  console.log("Creating Comments database...");

  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: "Comments" } }],
    properties: {
      Name: { title: {} },
      Comment: { rich_text: {} },
      "Post Slug": { rich_text: {} },
      Status: {
        select: {
          options: [
            { name: "Pending", color: "yellow" },
            { name: "Approved", color: "green" },
            { name: "Rejected", color: "red" },
          ],
        },
      },
      "Submitted At": { date: {} },
    },
  });

  console.log("✅ Comments database created!");
  console.log(`NOTION_COMMENTS_DATABASE_ID=${db.id}`);
}

main().catch(console.error);
