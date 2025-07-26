import type { Db } from "mongodb";
import { connectTodb } from "../db/db";
import csv from "csv-parser";
import fs from "fs";
import type { Collection } from "mongodb";
import { CSV_COLLECTIONS } from "./constants";
import type{ DistributionCenter,InventoryItem,OrderItem,Order,Product,User } from "./csvInterfaces";

type DocumentType = DistributionCenter | InventoryItem | OrderItem | Order | Product | User;

let db:Db | null= null;

try{
    db=await connectTodb();
}
catch(err){
    console.error("Error occured while creating db",err);
}

const convertTypes = (data: Record<string, any>, collectionName: string): DocumentType => {
  const converted = { ...data };
  
  switch (collectionName) {
    case 'distribution_centers':
      if (converted.id) converted.id = parseInt(converted.id);
      if (converted.latitude) converted.latitude = parseFloat(converted.latitude);
      if (converted.longitude) converted.longitude = parseFloat(converted.longitude);
      break;
      
    case 'inventory_items':
      if (converted.id) converted.id = parseInt(converted.id);
      if (converted.product_id) converted.product_id = parseInt(converted.product_id);
      if (converted.cost) converted.cost = parseFloat(converted.cost);
      if (converted.product_retail_price) converted.product_retail_price = parseFloat(converted.product_retail_price);
      if (converted.product_distribution_center_id) converted.product_distribution_center_id = parseInt(converted.product_distribution_center_id);
      // Convert timestamps
      if (converted.created_at) converted.created_at = new Date(converted.created_at);
      if (converted.sold_at && converted.sold_at !== '') converted.sold_at = new Date(converted.sold_at);
      break;
      
    case 'order_items':
      if (converted.id) converted.id = parseInt(converted.id);
      if (converted.order_id) converted.order_id = parseInt(converted.order_id);
      if (converted.user_id) converted.user_id = parseInt(converted.user_id);
      if (converted.product_id) converted.product_id = parseInt(converted.product_id);
      if (converted.inventory_item_id) converted.inventory_item_id = parseInt(converted.inventory_item_id);
      // Convert timestamps
      if (converted.created_at) converted.created_at = new Date(converted.created_at);
      if (converted.shipped_at && converted.shipped_at !== '') converted.shipped_at = new Date(converted.shipped_at);
      if (converted.delivered_at && converted.delivered_at !== '') converted.delivered_at = new Date(converted.delivered_at);
      if (converted.returned_at && converted.returned_at !== '') converted.returned_at = new Date(converted.returned_at);
      break;
      
    case 'orders':
      if (converted.order_id) converted.order_id = parseInt(converted.order_id);
      if (converted.user_id) converted.user_id = parseInt(converted.user_id);
      if (converted.num_of_item) converted.num_of_item = parseInt(converted.num_of_item);
      // Convert timestamps
      if (converted.created_at) converted.created_at = new Date(converted.created_at);
      if (converted.returned_at && converted.returned_at !== '') converted.returned_at = new Date(converted.returned_at);
      if (converted.shipped_at && converted.shipped_at !== '') converted.shipped_at = new Date(converted.shipped_at);
      if (converted.delivered_at && converted.delivered_at !== '') converted.delivered_at = new Date(converted.delivered_at);
      break;
      
    case 'products':
      if (converted.id) converted.id = parseInt(converted.id);
      if (converted.cost) converted.cost = parseFloat(converted.cost);
      if (converted.retail_price) converted.retail_price = parseFloat(converted.retail_price);
      if (converted.distribution_center_id) converted.distribution_center_id = parseInt(converted.distribution_center_id);
      break;
      
    case 'users':
      if (converted.id) converted.id = parseInt(converted.id);
      if (converted.age) converted.age = parseInt(converted.age);
      if (converted.latitude) converted.latitude = parseFloat(converted.latitude);
      if (converted.longitude) converted.longitude = parseFloat(converted.longitude);
      if (converted.created_at) converted.created_at = new Date(converted.created_at);
      break;
  }
  
  return converted as DocumentType;
};


const importCSV = (filePath: string, collectionName: string, db: Db): Promise<number> => {
  return new Promise((resolve, reject) => {
    const results: DocumentType[] = [];
    let rowCount: number = 0;
    
    console.log(`Starting import of ${filePath} to ${collectionName}...`);
    
    fs.createReadStream(filePath)
      .pipe(csv({
        skipLines: 0,
      }))
      .on('data', (data: Record<string, any>) => {
        // Convert data types based on collection
        const convertedData = convertTypes(data, collectionName);
        results.push(convertedData);
        rowCount++;
        
        // Log progress every 1000 rows
        if (rowCount % 1000 === 0) {
          console.log(`Processed ${rowCount} rows from ${filePath}`);
        }
      })
      .on('end', async () => {
        try {
          if (results.length > 0) {
            // Insert data in batches to handle large files
            const batchSize: number = 1000;
            const collection: Collection = db.collection(collectionName);
            
            // Clear existing data (optional - remove if you want to append)
            await collection.deleteMany({});
            console.log(`Cleared existing data in ${collectionName}`);
            
            for (let i = 0; i < results.length; i += batchSize) {
              const batch = results.slice(i, i + batchSize);
              await collection.insertMany(batch);
              console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} for ${collectionName}`);
            }
            
            console.log(`✅ Successfully imported ${results.length} records to ${collectionName}`);
            resolve(results.length);
          } else {
            console.log(`⚠️ No data found in ${filePath}`);
            resolve(0);
          }
        } catch (error) {
          console.error(`❌ Error inserting data to ${collectionName}:`, error);
          reject(error);
        }
      })
      .on('error', (error: Error) => {
        console.error(`❌ Error reading ${filePath}:`, error);
        reject(error);
      });
  });
};


const createIndexes = async (db: Db): Promise<void> => {
  console.log('Creating indexes...');
  
  try {
    // Distribution centers
    await db.collection('distribution_centers').createIndex({ id: 1 });
    
    // Inventory items
    await db.collection('inventory_items').createIndex({ id: 1 });
    await db.collection('inventory_items').createIndex({ product_id: 1 });
    await db.collection('inventory_items').createIndex({ product_distribution_center_id: 1 });
    
    // Order items
    await db.collection('order_items').createIndex({ id: 1 });
    await db.collection('order_items').createIndex({ order_id: 1 });
    await db.collection('order_items').createIndex({ user_id: 1 });
    await db.collection('order_items').createIndex({ product_id: 1 });
    
    // Orders
    await db.collection('orders').createIndex({ order_id: 1 });
    await db.collection('orders').createIndex({ user_id: 1 });
    
    // Products
    await db.collection('products').createIndex({ id: 1 });
    await db.collection('products').createIndex({ distribution_center_id: 1 });
    
    // Users
    await db.collection('users').createIndex({ id: 1 });
    await db.collection('users').createIndex({ email: 1 });
    
    console.log('✅ Indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};


const importAllCSVs = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    
    const db: Db = await connectTodb();
    
    console.log('Connected to MongoDB');
    // Import each CSV file
    for (const [csvFile, collectionName] of Object.entries(CSV_COLLECTIONS)) {
      try {

        const csvPath=`../data/${csvFile}`

        if (fs.existsSync(csvPath)) {
          await importCSV(csvPath, collectionName, db);
        } else {
          console.log(`⚠️ File ${csvPath} not found, skipping...`);
        }
      } catch (error) {
        console.error(`Error importing ${csvFile}:`, error);
      }
    }
    
    console.log('🎉 All CSV imports completed!');
    
    // Create indexes for better query performance
    await createIndexes(db);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  }
};


export { importAllCSVs, importCSV, convertTypes };
export type { 
  DistributionCenter, 
  InventoryItem, 
  OrderItem, 
  Order, 
  Product, 
  User,
  DocumentType 
};