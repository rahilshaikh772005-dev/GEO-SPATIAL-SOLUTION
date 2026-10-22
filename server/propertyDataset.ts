import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type PropertyDatasetRow = {
  Property_ID: string;
  House_No: number;
  Owner_Name: string;
  Property_Type: string;
  Property_Area_sqft: number;
  Building_Age_Years: number;
  Family_Size: number;
  Latitude: number;
  Longitude: number;
  Ward: string;
  Water_Usage_Liters: number;
  Electricity_Units: number;
  Previous_Tax: number;
  Current_Tax: number;
  Previous_Payment_Delay_Days: number;
  Distance_From_Municipal_Office_km: number;
  Payment_Status: string;
};

const PAGE_SIZE = 50;
const DATASET_FILENAME = "property_dataset.json";
let datasetPromise: Promise<PropertyDatasetRow[]> | undefined;

function getDatasetPath(): string {
  const candidates = [
    resolve(process.cwd(), "data", DATASET_FILENAME),
    resolve(process.cwd(), "server", "data", DATASET_FILENAME),
  ];
  const path = candidates.find(candidate => existsSync(candidate));
  if (!path) {
    throw new Error(`Property dataset file not found: ${DATASET_FILENAME}`);
  }
  return path;
}

async function loadDataset(): Promise<PropertyDatasetRow[]> {
  if (!datasetPromise) {
    datasetPromise = readFile(getDatasetPath(), "utf8")
      .then(contents => {
        const rows: unknown = JSON.parse(contents);
        if (!Array.isArray(rows)) {
          throw new Error("Property dataset must be a JSON array");
        }
        return rows as PropertyDatasetRow[];
      })
      .catch(error => {
        datasetPromise = undefined;
        throw error;
      });
  }
  return datasetPromise;
}

export async function getPropertyDatasetPage(input: {
  page: number;
  search: string;
}) {
  const rows = await loadDataset();
  const search = input.search.trim().toLocaleLowerCase();
  const matchingRows = search
    ? rows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLocaleLowerCase().includes(search),
        ),
      )
    : rows;
  const totalRows = matchingRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const page = Math.min(input.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return {
    rows: matchingRows.slice(start, start + PAGE_SIZE),
    totalRows,
    page,
    pageSize: PAGE_SIZE,
  };
}
